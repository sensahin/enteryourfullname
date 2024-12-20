"use client";

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

type ResponseType = {
  type: 'question' | 'identify' | 'done' | 'exit';
  question: string|null;
  response: string|null;
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
  const [viewState, setViewState] = useState<'start'|'question'|'identify'|'done'|'exit'>('start');
  const [questionText, setQuestionText] = useState('');
  const [identifyText, setIdentifyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fullname, setFullname] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

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

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/start', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ fullname })
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('Error starting:', text);
        setErrorMessage('Error starting the process.');
        setLoading(false);
        return;
      }
      const json: ResponseType = await res.json();
      setLoading(false);
      handleResponse(json);
    } catch (error) {
      console.error('Error in handleStart:', error);
      setLoading(false);
      setErrorMessage('An error occurred while starting.');
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
      const res = await fetch('/api/answer', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action})
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('Error handling action:', text);
        setErrorMessage('Error processing action.');
        setLoading(false);
        return;
      }
      const json: ResponseType = await res.json();
      setLoading(false);
      handleResponse(json);
    } catch (error) {
      console.error('Error in handleAction:', error);
      setLoading(false);
      setErrorMessage('An error occurred while processing action.');
    }
  }

  async function handleConfirmYes() {
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ confirm: translations[currentLanguage].yes.toLowerCase() })
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('Error confirming yes:', text);
        setErrorMessage('Error confirming identification.');
        setLoading(false);
        return;
      }
      const json: ResponseType = await res.json();
      setLoading(false);
      handleResponse(json);
    } catch (error) {
      console.error('Error in handleConfirmYes:', error);
      setLoading(false);
      setErrorMessage('An error occurred during confirmation.');
    }
  }

  async function handleConfirmNo() {
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ confirm: translations[currentLanguage].no.toLowerCase() })
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('Error confirming no:', text);
        setErrorMessage('Error confirming denial.');
        setLoading(false);
        return;
      }
      const json: ResponseType = await res.json();
      setLoading(false);
      handleResponse(json);
    } catch (error) {
      console.error('Error in handleConfirmNo:', error);
      setLoading(false);
      setErrorMessage('An error occurred during confirmation.');
    }
  }

  async function handleNoDone() {
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/exit');
      if (!res.ok) {
        const text = await res.text();
        console.error('Error exiting:', text);
        setErrorMessage('Error exiting.');
        setLoading(false);
        return;
      }
      const json: ResponseType = await res.json();
      setLoading(false);
      handleResponse(json);
    } catch (error) {
      console.error('Error in handleNoDone:', error);
      setLoading(false);
      setErrorMessage('An error occurred while exiting.');
    }
  }

  function handleYesDone() {
    window.location.href = '/';
  }

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

  if (!translations || Object.keys(translations).length === 0) {
    return <div>Loading translations...</div>;
  }

  const t = translations[currentLanguage] || translations['en'];

  return (
    <main>
      {loading && <div className="spinner"></div>}
      {errorMessage && <div className="error">{errorMessage}</div>}
      
      {!loading && !errorMessage && viewState === 'start' && (
        <div className="card">
          <form onSubmit={handleStart} className="start-form">
            <label className="form__label" htmlFor="fullnameInput">Enter your full name</label>
            <input 
              type="text" 
              className="form__field" 
              placeholder="Your full name..." 
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              id="fullnameInput"
              name="fullname"
              required 
            />
            <button type="submit" className="primary-button">Start</button>
          </form>
        </div>
      )}

      {!loading && !errorMessage && viewState === 'question' && (
        <div className="card">
          <p className="question-text">{questionText}</p>
          <div className="button-group">
            <button onClick={handleYes} className="primary-button">{t.yes}</button>
            <button onClick={handleNo} className="secondary-button">{t.no}</button>
          </div>
        </div>
      )}

      {!loading && !errorMessage && viewState === 'identify' && (
        <div className="card">
          <ReactMarkdown className="question-text">{identifyText}</ReactMarkdown>
          <div className="button-group">
            <button onClick={handleConfirmYes} className="primary-button">{t.yes}</button>
            <button onClick={handleConfirmNo} className="secondary-button">{t.no}</button>
          </div>
        </div>
      )}

      {!loading && !errorMessage && viewState === 'done' && (
        <div className="card">
          <h1>{t.done_prompt || 'One more?'}</h1>
          <div className="button-group">
            <button onClick={handleYesDone} className="primary-button">{t.yes}</button>
            <button onClick={handleNoDone} className="secondary-button">{t.no}</button>
          </div>
        </div>
      )}

      {!loading && !errorMessage && viewState === 'exit' && (
        <div className="card">
          <h1>{t.goodbye || 'Goodbye!'}</h1>
          <p>{t.thanks || 'Thank you.'}</p>
        </div>
      )}
    </main>
  );
}