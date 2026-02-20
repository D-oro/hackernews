# Hacker News Title Generator Frontend
React + TypeScript UI built with Vite.

## Prerequisites
- Node.js 18+ and npm

## Getting started
Install dependencies:

```bash
npm install
```

## Run the UI locally using the local API:

```bash
npm run dev
```
defaults to:
 http://localhost:5173


## Run tests
```bash
npm run test
```

## Run the UI locally using the deployed API:
you need a gcloud account to authenticate and deploy this project 

**Step 1)** Create a `.env.production` file which should look exactly the same as `.env.development` but replace `http://localhost:8080` with the url to gcp deployed API.

**Step 2)** Build and use production API:
```bash
npm run deploy 
```

This combines `npm run build` and `npm run preview`
defaults to:
http://localhost:4173/ 

