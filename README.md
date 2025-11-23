


# StakedSocial

![Chats](https://github.com/user-attachments/assets/404cc90b-df18-4876-be8b-84aa7895b4ad)

# Description
We all love prediction markets, but these are largely focused on global affairs and sports. My friends and I often spend a lot of time having informal bets with each other about things like sports (intramural games), if two friends will get in a relationship with each other, if a friend will fail a class, a round of poker, and other fun things! We thought it would be fun to build something out to facilitate this, and make it easy to do! The entire app revolves around group chats with friends, where any chat can have as many markets as they can. 

Along the way, we ran into a few issues around fairness, and addressed them as best we could. For example:

- Resolution: How do we do verification in a fair way. It can't be a simple majority since, in that case that if the majority loses, they could hijack a bet. Furthermore, it obviously can't be a single person who has sole authority over resolution.
We thought the fairest way would be requiring unanimous verification. To make it simpler, users can upload pictures of their friend's all giving a thumbs-up (resolve yes) or thumbs-down (resolve no), and using the facial embeddings, figure out the resolution. Additionally, the agentic feature allows you to upload a picture of proof with anti-watermarking to reduce doctored pictures. But really, if you're friends, hopefully you don't cheat!
- Bias: A person could bias the result if they knew about the bet. As a result, when making a prediction you can choose to 'hide' the market from certain people in the chat who it's about.
- What if everyone loses: we had the idea of just counting it as a 'house' stake, but thought that was a bit too cheeky, so we ended up deciding that it goes into a 'dinner fund'.
  
## How it's Made
The base app was made through a Celo-templated version of Farcaster, which made it much easier to work with and deploy the app! We used XMTP for all the chat-messaging between friends, managing friend groups, and a little bit with agents. We used facial landmarking (YOLO v7) and embedding (EigenFace) for the computer-vision-based verification and image extraction. The agentic workflow was built with simple tool calls through OpenAI (gpt 5 with minimal). We used Pyth for the nondeterminism in the casino and degen modes for a little bit more fun, and it let it be in a way where the user can confirm there's no foul play happening with how the randomness is done! Used HardHat for testing and deploying the contracts on-chain.


## To Run
A new Celo blockchain project

A modern Celo blockchain application built with Next.js, TypeScript, and Turborepo.
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Start the development server:
   ```bash
   pnpm dev
   ```


3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

- `apps/web` - Next.js application with embedded UI components and utilities

## Available Scripts

- `pnpm dev` - Start development servers
- `pnpm build` - Build all packages and apps
- `pnpm lint` - Lint all packages and apps
- `pnpm type-check` - Run TypeScript type checking

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Monorepo**: Turborepo
- **Package Manager**: PNPM
