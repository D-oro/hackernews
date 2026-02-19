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


## Run the UI locally using the deployed API:
you need a gcloud account to authenticate and deploy this project 

**Step 1)**  Authenticate by logging into gcloud 

```bash
gcloud auth login
```

**Step 2)** Create a `.env.production` file which should look exactly the same as `.env.development` but replace `http://localhost:8080` with the url to gcp deployed API.

```bash
gcloud auth login
```

**Step 3)** Build and use production API:
```bash
npm run deploy 
```
This combines `npm run build` and `npm run preview`
(I know, this doesn't actually deploy the frontend, but I wanted to keep the run commands the same for frontend and backend, mia culpa, Asche auf mein Haupt, please forgive me)

defaults to:
http://localhost:4173/ 

