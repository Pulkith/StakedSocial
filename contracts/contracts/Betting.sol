// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FriendsGroupBets (Gas‑optimized consensus + system resolution)
contract FriendsGroupBets {
    // --------------------------------------------------------------
    // STRUCT
    // --------------------------------------------------------------

    struct Market {
        uint256 id;
        address creator;
        address resolver;      // system backend
        bytes32 metadataHash;  // only on-chain reference
        uint64  deadline;
        uint256 shareSize;

        bool    resolved;
        bool    cancelled;
        uint8   winningOutcome;    // index

        address[] participants;     // voters + bettors
        address[] targetParticipants;

        uint256[] totalStaked;      // per outcome
        // voteOutcome[user] = outcomeIndex or 255 for "no vote"
    }

    uint256 public nextMarketId;
    mapping(uint256 => Market) public markets;

    // stakes[marketId][user][outcomeIndex]
    mapping(uint256 => mapping(address => uint256[])) public stakes;
    mapping(uint256 => mapping(address => bool)) public hasWithdrawn;
    mapping(uint256 => mapping(address => bool)) public isParticipant;
    mapping(uint256 => mapping(address => bool)) public isTarget;

    // record consensus votes: voteOutcome[marketId][user]
    mapping(uint256 => mapping(address => uint8)) public voteOutcome;
    // voteCancel[marketId][user]
    mapping(uint256 => mapping(address => bool)) public voteCancel;

    // --------------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------------

    event MarketCreated(uint256 indexed id, bytes32 metadataHash);
    event BetPlaced(uint256 indexed id, address indexed user, uint256 outcome, uint256 amt);
    event VoteOutcome(uint256 indexed id, address indexed user, uint8 outcome);
    event VoteCancel(uint256 indexed id, address indexed user, bool cancelVote);
    event MarketResolved(uint256 indexed id, uint8 outcome, bool forced);
    event MarketCancelled(uint256 indexed id, bool forced);
    event Withdrawal(uint256 indexed id, address indexed user, uint256 amount);

    // --------------------------------------------------------------
    // CREATE
    // --------------------------------------------------------------

    function createMarket(
        bytes32 metadataHash,
        uint64 deadline,
        address resolverAddr,
        uint256 shareSize,
        address[] memory targetList,
        uint256 outcomesCount
    ) external returns (uint256 id) {
        require(deadline > block.timestamp, "bad deadline");
        require(metadataHash != 0, "no hash");
        require(shareSize > 0, "bad share");
        require(outcomesCount > 0, "no outcomes");

        id = nextMarketId++;
        Market storage m = markets[id];

        m.id = id;
        m.creator = msg.sender;
        m.resolver = resolverAddr;
        m.metadataHash = metadataHash;
        m.deadline = deadline;
        m.shareSize = shareSize;
        m.winningOutcome = type(uint8).max;

        uint256[] memory arr = new uint256[](outcomesCount);
        m.totalStaked = arr;

        m.targetParticipants = targetList;
        for (uint256 i; i < targetList.length; i++) {
            isTarget[id][targetList[i]] = true;
        }

        emit MarketCreated(id, metadataHash);
    }

    // --------------------------------------------------------------
    // BET
    // --------------------------------------------------------------

    function placeBet(uint256 id, uint256 outcome) external payable {
        Market storage m = markets[id];
        require(!m.resolved && !m.cancelled, "closed");
        require(block.timestamp < m.deadline, "deadline");
        require(!isTarget[id][msg.sender], "target");
        require(outcome < m.totalStaked.length, "bad idx");
        require(msg.value > 0 && msg.value % m.shareSize == 0, "bad amt");

        if (!isParticipant[id][msg.sender]) {
            isParticipant[id][msg.sender] = true;
            m.participants.push(msg.sender);
            voteOutcome[id][msg.sender] = 255;
        }

        if (stakes[id][msg.sender].length == 0) {
            stakes[id][msg.sender] = new uint256[](m.totalStaked.length);
        }

        m.totalStaked[outcome] += msg.value;
        stakes[id][msg.sender][outcome] += msg.value;

        emit BetPlaced(id, msg.sender, outcome, msg.value);
    }

    // --------------------------------------------------------------
    // CONSENSUS VOTING
    // --------------------------------------------------------------

    function voteResolve(uint256 id, uint8 outcome) external {
        Market storage m = markets[id];
        require(isParticipant[id][msg.sender], "not part");
        require(!m.resolved && !m.cancelled, "final");
        require(outcome < m.totalStaked.length, "bad");

        voteOutcome[id][msg.sender] = outcome;
        emit VoteOutcome(id, msg.sender, outcome);

        _tryConsensusResolve(id);
    }

    function voteToCancel(uint256 id, bool v) external {
        Market storage m = markets[id];
        require(isParticipant[id][msg.sender], "not part");
        require(!m.resolved && !m.cancelled, "final");

        voteCancel[id][msg.sender] = v;
        emit VoteCancel(id, msg.sender, v);

        _tryConsensusCancel(id);
    }

    function _tryConsensusResolve(uint256 id) internal {
        Market storage m = markets[id];
        uint8 first = 255;

        for (uint256 i; i < m.participants.length; i++) {
            address u = m.participants[i];
            if (isTarget[id][u]) continue;
            uint8 v = voteOutcome[id][u];
            if (v == 255) return;
            if (first == 255) first = v;
            else if (v != first) return;
        }

        _resolve(id, first, false);
    }

    function _tryConsensusCancel(uint256 id) internal {
        Market storage m = markets[id];

        for (uint256 i; i < m.participants.length; i++) {
            address u = m.participants[i];
            if (isTarget[id][u]) continue;
            if (!voteCancel[id][u]) return;
        }

        _cancel(id, false);
    }

    // --------------------------------------------------------------
    // SYSTEM (forced) RESOLUTION/CANCEL
    // --------------------------------------------------------------

    function systemResolve(uint256 id, uint8 outcome, bytes32 metadataHash)
        external
    {
        Market storage m = markets[id];
        require(msg.sender == m.resolver, "not sys");
        require(!m.resolved && !m.cancelled, "done");
        require(outcome < m.totalStaked.length, "bad idx");
        require(metadataHash == m.metadataHash, "bad hash");

        _resolve(id, outcome, true);
    }

    function systemCancel(uint256 id) external {
        Market storage m = markets[id];
        require(msg.sender == m.resolver, "not sys");
        require(!m.resolved && !m.cancelled, "done");
        _cancel(id, true);
    }

    // --------------------------------------------------------------
    // INTERNAL FINALIZATION
    // --------------------------------------------------------------

    function _resolve(uint256 id, uint8 outcome, bool forced) internal {
        Market storage m = markets[id];
        m.resolved = true;
        m.winningOutcome = outcome;
        emit MarketResolved(id, outcome, forced);
    }

    function _cancel(uint256 id, bool forced) internal {
        Market storage m = markets[id];
        m.cancelled = true;
        emit MarketCancelled(id, forced);
    }

    // --------------------------------------------------------------
    // WITHDRAW
    // --------------------------------------------------------------

    function withdraw(uint256 id) external {
        Market storage m = markets[id];
        require(m.resolved || m.cancelled || block.timestamp >= m.deadline, "not final");
        require(!hasWithdrawn[id][msg.sender], "done");

        if (!m.resolved && !m.cancelled && block.timestamp >= m.deadline) {
            _cancel(id, false);
        }

        hasWithdrawn[id][msg.sender] = true;

        uint256[] storage s = stakes[id][msg.sender];
        uint256 payout;

        if (m.cancelled) {
            for (uint256 i; i < s.length; i++) payout += s[i];
        } else {
            uint8 w = m.winningOutcome;

            uint256 userW = s[w];
            uint256 totalPool;
            for (uint256 i; i < m.totalStaked.length; i++) totalPool += m.totalStaked[i];

            uint256 winPool = m.totalStaked[w];
            if (winPool == 0) {
                for (uint256 i; i < s.length; i++) payout += s[i];
            } else if (userW > 0) {
                payout = (userW * totalPool) / winPool;
            }
        }

        for (uint256 i; i < s.length; i++) s[i] = 0;

        if (payout > 0) {
            (bool ok,) = msg.sender.call{value: payout}("");
            require(ok);
        }

        emit Withdrawal(id, msg.sender, payout);
    }
}

// function getMarketTotals(uint256 marketId) external view returns (uint256[] memory totals) { Market storage m = markets[marketId]; return m.totalStaked; } 
// function getUserStakes(uint256 marketId, address user) external view returns (uint256[] memory stakes) { return userStakes[marketId][user]; }
//  function getParticipants(uint256 marketId) external view returns (address[] memory) { return markets[marketId].participants; } 
//  function getTargetParticipants(uint256 marketId) external view returns (address[] memory) {