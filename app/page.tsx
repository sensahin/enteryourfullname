"use client";

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon } from '@fortawesome/free-solid-svg-icons';

type ResponseType = {
  type: 'question' | 'identify' | 'done' | 'exit';
  question: string | null;
  response: string | null;
  language: string;
  error?: string;
};

type TranslationData = {
  yes: string;
  no: string;
  done_prompt?: string;
  goodbye?: string;
  thanks?: string;
};

type Translations = {
  [languageCode: string]: TranslationData;
};

export default function Page() {
  const [translations, setTranslations] = useState<Translations>({});
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [viewState, setViewState] = useState<
    'start' | 'question' | 'identify' | 'done' | 'exit'
  >('start');
  const [questionText, setQuestionText] = useState('');
  const [identifyText, setIdentifyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fullname, setFullname] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Images from the search (we display them while loading)
  const [images, setImages] = useState<string[]>([]);
  // Current index for the scanning effect
  const [scanIndex, setScanIndex] = useState(0);

  // On component mount, check for saved theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme === 'dark' ? 'dark' : 'light');
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  }, []);

  // Load translations
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/translations.json');
        if (!res.ok) {
          console.error('Failed to load translations:', await res.text());
          setErrorMessage('Failed to load translations.');
          return;
        }
        const data: Translations = await res.json();
        setTranslations(data);
      } catch (error) {
        console.error('Error loading translations:', error);
        setErrorMessage('Error loading translations.');
      }
    })();
  }, []);

  // Scanning effect interval (carousel), only relevant if we have images
  useEffect(() => {
    if (images.length === 0) return;
    const interval = setInterval(() => {
      setScanIndex((prev) => (prev + 1) % images.length);
    }, 1500);

    return () => clearInterval(interval);
  }, [images]);

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', newTheme);
  }

  // Helper to parse server error JSON
  async function handleNonOkResponse(res: Response) {
    let serverErrorMessage = 'An unknown error occurred.';
    try {
      const errorJson = await res.json();
      if (errorJson?.error) {
        serverErrorMessage = errorJson.error;
      }
    } catch (parseError) {
      console.error('Could not parse error response as JSON:', parseError);
    }
    return serverErrorMessage;
  }

  // =========== Handlers ===========

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullname }),
      });

      if (!res.ok) {
        const serverErrorMessage = await handleNonOkResponse(res);
        console.error('Error starting:', serverErrorMessage);
        setErrorMessage(serverErrorMessage);
        setLoading(false);
        return;
      }

      const json: ResponseType & {
        thread_id?: string;
        questions_asked?: number;
        max_questions?: string;
        images?: string[];
      } = await res.json();
      setLoading(false);

      if (json.error) {
        setErrorMessage(json.error);
        return;
      }

      // Save needed data to localStorage
      if (json.thread_id) localStorage.setItem('thread_id', json.thread_id);
      if (typeof json.questions_asked === 'number') {
        localStorage.setItem('questions_asked', json.questions_asked.toString());
      }
      if (json.max_questions) {
        localStorage.setItem('max_questions', json.max_questions);
      }
      localStorage.setItem('language', json.language);

      // Store images (we'll show them while loading next times)
      if (json.images && json.images.length > 0) {
        setImages(json.images);
      } else {
        setImages([]);
      }

      handleResponse(json);
    } catch (error) {
      console.error('Error in handleStart:', error);
      setLoading(false);
      setErrorMessage(
        (error as Error).message || 'An error occurred while starting.'
      );
    }
  }

  async function handleYes() {
    await handleAction(translations[currentLanguage]?.yes?.toLowerCase() || 'yes');
  }

  async function handleNo() {
    await handleAction(translations[currentLanguage]?.no?.toLowerCase() || 'no');
  }

  async function handleAction(action: string) {
    setErrorMessage('');
    setLoading(true);
    try {
      const thread_id = localStorage.getItem('thread_id');
      const questions_asked = localStorage.getItem('questions_asked');

      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          thread_id,
          questions_asked: questions_asked ? parseInt(questions_asked, 10) : 0,
        }),
      });

      if (!res.ok) {
        const serverErrorMessage = await handleNonOkResponse(res);
        console.error('Error handling action:', serverErrorMessage);
        setErrorMessage(serverErrorMessage);
        setLoading(false);
        return;
      }

      const json: ResponseType & {
        language?: string;
        questions_asked?: number;
      } = await res.json();
      setLoading(false);

      handleResponse(json);

      // If there's new questions_asked or language, update localStorage
      if (typeof json.questions_asked === 'number') {
        localStorage.setItem('questions_asked', json.questions_asked.toString());
      }
      if (json.language) {
        localStorage.setItem('language', json.language);
        setCurrentLanguage(json.language);
      }
    } catch (error) {
      console.error('Error in handleAction:', error);
      setLoading(false);
      setErrorMessage(
        (error as Error).message || 'An error occurred while processing action.'
      );
    }
  }

  async function handleConfirmYes() {
    setErrorMessage('');
    setLoading(true);
    try {
      const thread_id = localStorage.getItem('thread_id');
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: translations[currentLanguage].yes.toLowerCase(),
          thread_id,
          language: currentLanguage,
        }),
      });

      if (!res.ok) {
        const serverErrorMessage = await handleNonOkResponse(res);
        console.error('Error confirming yes:', serverErrorMessage);
        setErrorMessage(serverErrorMessage);
        setLoading(false);
        return;
      }

      const json: ResponseType & { language?: string } = await res.json();
      setLoading(false);
      handleResponse(json);

      if (json.language) {
        localStorage.setItem('language', json.language);
        setCurrentLanguage(json.language);
      }
    } catch (error) {
      console.error('Error in handleConfirmYes:', error);
      setLoading(false);
      setErrorMessage(
        (error as Error).message || 'An error occurred during confirmation.'
      );
    }
  }

  async function handleConfirmNo() {
    setErrorMessage('');
    setLoading(true);
    try {
      const thread_id = localStorage.getItem('thread_id');
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: translations[currentLanguage].no.toLowerCase(),
          thread_id,
          language: currentLanguage,
        }),
      });

      if (!res.ok) {
        const serverErrorMessage = await handleNonOkResponse(res);
        console.error('Error confirming no:', serverErrorMessage);
        setErrorMessage(serverErrorMessage);
        setLoading(false);
        return;
      }

      const json: ResponseType & { language?: string } = await res.json();
      setLoading(false);
      handleResponse(json);

      if (json.language) {
        localStorage.setItem('language', json.language);
        setCurrentLanguage(json.language);
      }
    } catch (error) {
      console.error('Error in handleConfirmNo:', error);
      setLoading(false);
      setErrorMessage(
        (error as Error).message || 'An error occurred during confirmation.'
      );
    }
  }

  async function handleNoDone() {
    setErrorMessage('');
    setLoading(true);
    try {
      const thread_id = localStorage.getItem('thread_id');
      const res = await fetch(
        `/api/exit?thread_id=${encodeURIComponent(
          thread_id || ''
        )}&language=${encodeURIComponent(currentLanguage)}`
      );
      if (!res.ok) {
        const serverErrorMessage = await handleNonOkResponse(res);
        console.error('Error exiting:', serverErrorMessage);
        setErrorMessage(serverErrorMessage);
        setLoading(false);
        return;
      }
      const json: ResponseType = await res.json();
      setLoading(false);
      handleResponse(json);
    } catch (error) {
      console.error('Error in handleNoDone:', error);
      setLoading(false);
      setErrorMessage(
        (error as Error).message || 'An error occurred while exiting.'
      );
    }
  }

  function handleYesDone() {
    // Redirect to root or do something else
    window.location.href = '/';
  }

  // =========== Handle new server response ===========

  function handleResponse(response: ResponseType) {
    if (response.error) {
      setErrorMessage(response.error);
      return;
    }
    const { type, question, response: identifyResponse, language } = response;

    setCurrentLanguage(language || 'en');
    if (!translations[language || 'en']) {
      setCurrentLanguage('en');
    }

    if (type === 'question') {
      setViewState('question');
      setQuestionText(question || '');
    } else if (type === 'identify') {
      setViewState('identify');
      setIdentifyText(identifyResponse || '');
    } else if (type === 'done') {
      setViewState('done');
    } else if (type === 'exit') {
      setViewState('exit');
    }
  }

  // =========== Rendering the scanning carousel ===========

  function renderScanner() {
    // Show the "scanning" effect with images
    if (images.length === 0) {
      // If no images, fallback to spinner
      return <div className="spinner"></div>;
    }
    return (
      <div className="scanner-container">
        <img
          key={scanIndex}
          src={images[scanIndex]}
          alt="Scanning"
          className="scanner-image"
        />
      </div>
    );
  }

  const t = translations[currentLanguage] || translations['en'];

  // =========== Return JSX ===========

  return (
    <>
      <header className="header">
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label="Toggle dark mode"
        >
          <FontAwesomeIcon icon={faMoon} />
        </button>
      </header>

      <main>
        {errorMessage && <div className="error">{errorMessage}</div>}

        {/**
         * If we're "loading", show images (scanner) OR spinner if no images.
         * Otherwise, show the normal UI (question, identify, done, exit).
         */}

        {loading ? (
          renderScanner()
        ) : (
          <>
            {/* START */}
            {viewState === 'start' && (
              <div className="card">
                <form onSubmit={handleStart} className="start-form">
                  <div className="form__group field">
                    <input
                      type="text"
                      className="form__field"
                      placeholder="Enter your full name"
                      name="fullname"
                      id="fullnameInput"
                      value={fullname}
                      onChange={(e) => setFullname(e.target.value)}
                      required
                    />
                    <label htmlFor="fullnameInput" className="form__label">
                      Enter your full name
                    </label>
                  </div>
                </form>
              </div>
            )}

            {/* QUESTION */}
            {viewState === 'question' && (
              <div className="card">
                <p className="question-text">{questionText}</p>
                <div className="button-group">
                  <button onClick={handleYes} className="primary-button">
                    {t.yes}
                  </button>
                  <button onClick={handleNo} className="secondary-button">
                    {t.no}
                  </button>
                </div>
              </div>
            )}

            {/* IDENTIFY */}
            {viewState === 'identify' && (
              <div className="reveal-card">
                <ReactMarkdown className="question-text">
                  {identifyText}
                </ReactMarkdown>
                <div className="button-group">
                  <button onClick={handleConfirmYes} className="primary-button">
                    {t.yes}
                  </button>
                  <button
                    onClick={handleConfirmNo}
                    className="secondary-button"
                  >
                    {t.no}
                  </button>
                </div>
              </div>
            )}

            {/* DONE */}
            {viewState === 'done' && (
              <div className="card">
                <h1>{t.done_prompt || 'One more?'}</h1>
                <div className="button-group">
                  <button onClick={handleYesDone} className="primary-button">
                    {t.yes}
                  </button>
                  <button onClick={handleNoDone} className="secondary-button">
                    {t.no}
                  </button>
                </div>
              </div>
            )}

            {/* EXIT */}
            {viewState === 'exit' && (
              <div className="card">
                <h1>{t.goodbye || 'Goodbye!'}</h1>
                <p>{t.thanks || 'Thank you.'}</p>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}