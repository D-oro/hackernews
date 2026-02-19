import {TitleIdea} from "../../types";
import "./TitleIdeas.css";

export default function TitleIdeas({ideas}: {ideas: TitleIdea[] | null}) {
  const displayIdeas = ideas ?? [];

  return (
    <section>
      <ul>
        {displayIdeas.map((idea, index) => (
          <li key={idea.title}>
            <div className="idea-index">0{index + 1}</div>
            <div>
              <h2>{idea.title}</h2>
              <p>{idea.rationale}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
