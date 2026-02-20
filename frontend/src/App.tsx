import {useState} from "react";
import "./App.css";
import InputForm from "./components/InputForm/InputForm";
import {TitleIdea} from "./types";
import TitleIdeas from "./components/TitleIdeas/TitleIdeas";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export default function App() {
  const [titleIdeas, setTitleIdeas] = useState<TitleIdea[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const handleSubmit = async (url: string) => {
    setStatus("loading");
    setErrorMessage("");
    setTitleIdeas([]);

    try {
      const response = await fetch(apiBaseUrl, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({url}),
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as {error?: string};
        throw new Error(errorBody.error ?? "Request failed");
      }

      const data = (await response.json()) as unknown;

      if (!Array.isArray(data)) {
        throw new Error("Unexpected response shape (expected an array).");
      }

      setTitleIdeas(data as TitleIdea[]);
      setStatus("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      setStatus("error");
    }
  };

  return (
    <div className="page">
      <header>
        <h1>Hacker News Title Generator</h1>
      </header>
      <main>
        <InputForm onSubmit={handleSubmit} isLoading={status === "loading"} />
        {status === "error" && <p>{errorMessage}</p>}

        {status !== "error" && titleIdeas.length > 0 && (
          <TitleIdeas ideas={titleIdeas} />
        )}
      </main>
    </div>
  );
}
