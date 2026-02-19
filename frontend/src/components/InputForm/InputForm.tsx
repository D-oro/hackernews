import {FormEvent, useState} from "react";

import "./InputForm.css";

type InputFormProps = {
  onSubmit: (value: string) => void;
  isLoading?: boolean;
};

function InputForm({onSubmit, isLoading = false}: InputFormProps) {
  const [value, setValue] = useState("");
  const isDisabled = isLoading || value.trim().length === 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isDisabled) return;
    onSubmit(value);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="url-input">Generate titles for this URL:</label>
      <div className="input-row">
        <input
          id="url-input"
          name="url-input"
          type="url"
          placeholder="https://example.com"
          required
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={isLoading}
        />
        <button type="submit" disabled={isDisabled}>
          {isLoading ? "Generating..." : "Generate"}
        </button>
      </div>
    </form>
  );
}

export default InputForm;
