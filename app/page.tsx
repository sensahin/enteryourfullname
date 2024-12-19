"use client";

import { useState, useEffect } from 'react';

type ResponseType = {
  type: 'question' | 'identify' | 'done' | 'exit';
  question: string|null;
  response: string|null;
  language: string;
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

  useEffect(() => {
    fetch('/translations.json')
      .then(res => res.json())
      .then((data: Translations) => setTranslations(data));
  }, []);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/start', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ fullname })
    });
    const json: ResponseType = await res.json();
    setLoading(false);
    handleResponse(json);
  }

  async function handleYes() {
    await handleAction(translations[currentLanguage].yes.toLowerCase());
  }

  async function handleNo() {
    await handleAction(translations[currentLanguage].no.toLowerCase());
  }

  async function handleAction(action: string) {
    setLoading(true);
    const res = await fetch('/api/answer', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action})
    });
    const json: ResponseType = await res.json();
    setLoading(false);
    handleResponse(json);
  }

  async function handleConfirmYes() {
    setLoading(true);
    const res = await fetch('/api/confirm', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ confirm: translations[currentLanguage].yes.toLowerCase() })
    });
    const json: ResponseType = await res.json();
    setLoading(false);
    handleResponse(json);
  }

  async function handleConfirmNo() {
    setLoading(true);
    const res = await fetch('/api/confirm', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ confirm: translations[currentLanguage].no.toLowerCase() })
    });
    const json: ResponseType = await res.json();
    setLoading(false);
    handleResponse(json);
  }

  async function handleNoDone() {
    setLoading(true);
    const res = await fetch('/api/exit');
    const json: ResponseType = await res.json();
    setLoading(false);
    handleResponse(json);
  }

  function handleYesDone() {
    window.location.href = '/';
  }

  function handleResponse(response: ResponseType) {
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

  if (!translations || Object.keys(translations).length === 0) return <div className="spinner"></div>;

  const t = translations[currentLanguage] || translations['en'];

  return (
    <main>
      {loading && <div className="spinner"></div>}
      {!loading && viewState === 'start' && (
        <div className="form__group field">
          <form onSubmit={handleStart}>
            <input 
              type="text" 
              className="form__field" 
              placeholder="Enter your full name" 
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              id="fullnameInput"
              name="fullname"
              required 
            />
            <label className="form__label" htmlFor="fullnameInput">Enter your full name</label>
          </form>
        </div>
      )}

      {!loading && viewState === 'question' && (
        <div>
          <p className="question-text">{questionText}</p>
          <div className="flex-row">
            <button onClick={handleYes}>{t.yes}</button>
            <button onClick={handleNo}>{t.no}</button>
          </div>
        </div>
      )}

      {!loading && viewState === 'identify' && (
        <div>
          <p className="question-text">{identifyText}</p>
          <div className="flex-row">
            <button onClick={handleConfirmYes}>{t.yes}</button>
            <button onClick={handleConfirmNo}>{t.no}</button>
          </div>
        </div>
      )}

      {!loading && viewState === 'done' && (
        <div>
          <h1>{t.done_prompt || 'One more?'}</h1>
          <div className="flex-row">
            <button onClick={handleYesDone}>{t.yes}</button>
            <button onClick={handleNoDone}>{t.no}</button>
          </div>
        </div>
      )}

      {!loading && viewState === 'exit' && (
        <div>
          <h1>{t.goodbye || 'Goodbye!'}</h1>
          <p>{t.thanks || 'Thank you.'}</p>
        </div>
      )}
    </main>
  );
}