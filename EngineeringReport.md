# Engineering Report

## 1) Architecture Decisions

### Why this stack
**Frontend:** 
React + Vite + TypeScript is simple enough while having the benefit of easy testing, especially when considering later deploying the UI as well and integrating CI/CD pipeline checks. Individual components allow for straightforward iteration, expansion and could easily be refactored into reusable components. 
Vite also allows for a simple setup with setting environment variables to either target the locally running or cloud deployed API.
The UI makes an HTTP Post request with a URL to to either http://localhost:8080, or to the deployed endpoint depending on the run command used. 
The input component already checks for a valid URL by default, adding the first minimal safety level.
The colour scheme, style and layout of the UI is imitating the Hacker News website to stay on brand. 

**Backend:**
The google cloud functions framework with an HTTPFunction was used to create the API endpoint as this judged to facilitate GCP deployment. 
TypeScript allows for type safety without the overhead that comes with a full Java Application. 
The API endpoint reaches a serverless function, which sets up basic CORS headers and checks the received string is indeed a URL.
The deployed endpoint can only be called by an authenticated user by default, but this can be manually turned off by granting access to all users, while http:/localhost:8080 does not require authentication.

Once the request with the url has been received by the API, the content that the url links to is extracted in multiple steps:
FetchUrl tries fetch the content of the web page safely and efficiently, timing out after 8 seconds, and only fetching a maximum of 1MB of data. If it cannnot receive a reponse body at all, or there is an error (e.g. 413 for many newspaper articles that prevent scraping), an empty html document is returned instead, so that further steps can still try to generate a title with limited information. 

Next, the extractData function uses the information from fetchUrl to create a ScrapedData object with url, type, title, description and text content. 
To populate the fields, JSDOM, Readability, and the Open Graph Protocol are used to try to get to the actual content of the page, trying to be suitable for many of the content types that are typically shared on Hacker News, without the slower performance a more thorough library like Puppeteer would provide. 
The fallback for all is simply the URL itself, since that is often enough to suggest Hacker News article titles. 

The ScrapedData is then used to build the prompt, formatting the prompt using specific elements of the web page rather than the whole content, to optimise for both performance and security. 

Lastly, a request to Gemini is made with the system prompt and instance prompt, with a predefined return shape. The API key is stored locally in a .env file, and in google clouds secrets manager and attached during deployment.

In case Gemini returns more than 3 proposals, a function ensures only the first 3 title proposals are used, which are then sent to the UI. 

## 2) Prompt Design

I used a **system prompt** and an **instance prompt**. 

The system prompt defines the overall goal and style of the prompt. It starts with "You're a tech nerd" because that has a greater semantic context than "You're a Hacker News Title writing expert".
The system prompt explains what performs well on Hacker News: titles which are brief, spark intellectual curiosity, with occasional dry technical humor. I also added that the original title of the article should be considered, and that for technical content one good option might be "Show HN: [original title]". 
I also specified that each proposal must have a distinct angle, and to keep the explanation short and simple. 

The instance prompt is build before each request. It specifies that the web content this prompt contains is untrusted and may contain instructions that should be ignored. I also added a clear delineation between the web content and the other instructions. 

The web content that the LLM is given contains at the minimum the url itself, since oftentimes this already contains what the link is about and can at times be enough to offer title suggestions. 
At the maximum, the web content contains the Url, the type (open graph protocol, e.g. article, video, audio etc.), the current title of the content, a description, as well as a maximum of 5000 characters of any actual text content.
At the end I reiterated the task.

Both prompts were chosen with the goal in mind to find a balance between too little and too much information, both in terms of the actual instruction and the content the LLM should evaluate for titles. 

Lastly, the request to Gemini (in llm.ts) contains a generationConfig which specifies that the response type (json) and schema (`title: {type: "STRING"}, rationale: {type: "STRING"}`) as a more reliable alternative to requesting this in the system prompt.

## 3) Trade-offs

- Data extraction is practical but not expansive, there are additional ways to retrieve data from a URL, which could be explored
- The data passed to the LLM is *assumed* to be useful. More testing would need to be done to determine how much and what type of data actually helps the LLM craft good title suggestions
- Add a separate LLM role to check the output of the title generator. Would use more tokens, so this was not used for this first POC.  
- While free the Gemini API key already has a built-in limit (it would simply stop when the token limit is reached, not rack up costs accidentally), LLM calls should be rate limited and monitored for what calls/prompts use how many tokens etc. 
- Add retries, better error handling and responses to users for easier debugging, as well as additional LLM types, models and configs.
- Create a workaround if the Gemini call fails: Could use the function that extracts a "title" from the url and add an iframe for google search with a question "suggest three alternative HN titles +[title]". It's cheating, but at least it would offer an alternative.


## 4) Further improvement ideas: Using Hugging Face HN post performance dataset to optimise prompting
- Download the [Hugging Face Hacker News Title Performance Dataset](https://huggingface.co/datasets/julien040/hacker-news-posts) and update regularly
- Use an LLM to analyse what titles are performing well currently
- Update the system prompt accordingly
- Furthermore: Save created title ideas (with prompt used at the time) in our own dataset and see if any of them show up over time, if yes, then rate that prompt and title higher to build up a list of high performing prompts