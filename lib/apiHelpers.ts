// lib/apiHelpers.ts

import axios from 'axios';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;

interface GoogleSearchItem {
  title?: string;
  snippet?: string;
  link?: string;
  image?: {
    contextLink?: string;
    height?: number;
    width?: number;
  };
}

interface AssistantMessagePart {
  type: string;
  text?: {
    value: string;
  }
}

/**
 * Fetch search results from Google Custom Search
 * If searchType === "image", we retrieve image results
 * otherwise we do normal web search.
 */
export async function google_search(
  query: string,
  api_key = GOOGLE_API_KEY,
  cse_id = GOOGLE_CSE_ID,
  num = 10,
  searchType: "web" | "image" = "web",
  imgType?: "clipart" | "face" | "lineart" | "stock" | "photo" | "animated"
) {
  const search_url = "https://www.googleapis.com/customsearch/v1";
  const params: any = {
    q: query,
    key: api_key,
    cx: cse_id,
    num: num,
  };
  if (searchType === "image") {
    params.searchType = "image";
    if (imgType) {
        params.imgType = imgType;
      }
  }

  const response = await axios.get(search_url, { params });
  const data = response.data;
  const items: GoogleSearchItem[] = data.items || [];

  // Build the textual summary as before
  let results_text = "";
  items.forEach((item: GoogleSearchItem, i: number) => {
    const title = item.title || "";
    const snippet = item.snippet || "";
    const link = item.link || "";
    results_text += `Result ${i + 1}:\nTitle: ${title}\nSnippet: ${snippet}\nLink: ${link}\n\n`;
  });

  // Also gather image links (if we did an image search)
  // We'll just store `item.link` as the direct image URL
  const image_links = items.map((item) => item.link).filter(Boolean);

  return {
    text: results_text,
    images: image_links,
  };
}

export async function create_thread(messages: {role:string, content:string}[]) {
  const url = "https://api.openai.com/v1/threads";
  const headers = {
    "Authorization": `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": "assistants=v2"
  };
  const payload = { messages };
  const r = await axios.post(url, payload, { headers });
  return r.data;
}

export async function add_message_to_thread(thread_id: string, role: string, content: string) {
  const url = `https://api.openai.com/v1/threads/${thread_id}/messages`;
  const headers = {
    "Authorization": `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": "assistants=v2"
  };
  const payload = { role, content };
  const r = await axios.post(url, payload, { headers });
  return r.data;
}

export async function create_run(thread_id: string, assistant_id=ASSISTANT_ID) {
  const url = `https://api.openai.com/v1/threads/${thread_id}/runs`;
  const headers = {
    "Authorization": `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": "assistants=v2"
  };
  const payload = {
    assistant_id,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "assistant_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["question", "identify", "done", "exit"] },
            language: { type: "string" },
            question: { type: ["string", "null"] },
            response: { type: ["string", "null"] }
          },
          required: ["type", "language", "question", "response"],
          additionalProperties: false
        }
      }
    }
  };

  const r = await axios.post(url, payload, { headers });
  return r.data;
}

export async function retrieve_run(thread_id: string, run_id: string) {
  const url = `https://api.openai.com/v1/threads/${thread_id}/runs/${run_id}`;
  const headers = {
    "Authorization": `Bearer ${OPENAI_API_KEY}`,
    "OpenAI-Beta": "assistants=v2"
  };
  const r = await axios.get(url, { headers });
  return r.data;
}

export async function list_run_steps(thread_id: string, run_id: string) {
  const url = `https://api.openai.com/v1/threads/${thread_id}/runs/${run_id}/steps`;
  const headers = {
    "Authorization": `Bearer ${OPENAI_API_KEY}`,
    "OpenAI-Beta": "assistants=v2"
  };
  const r = await axios.get(url, { headers });
  return r.data;
}

export async function retrieve_message(thread_id: string, message_id: string) {
  const url = `https://api.openai.com/v1/threads/${thread_id}/messages/${message_id}`;
  const headers = {
    "Authorization": `Bearer ${OPENAI_API_KEY}`,
    "OpenAI-Beta": "assistants=v2"
  };
  const r = await axios.get(url, { headers });
  return r.data;
}

export async function wait_for_run_completion(thread_id: string, run_id: string, timeout=120000) {
  const startTime = Date.now();
  while (true) {
    const run_data = await retrieve_run(thread_id, run_id);
    const status = run_data.status;
    if (status === "completed") {
      return true;
    }
    if (Date.now() - startTime > timeout) {
      throw new Error("Run did not complete in time.");
    }
    await new Promise(res => setTimeout(res, 500));
  }
}

export async function get_last_assistant_message(thread_id: string, run_id: string) {
  const steps_data = await list_run_steps(thread_id, run_id);
  const steps = steps_data.data || [];
  for (let i = steps.length - 1; i >= 0; i--) {
    const step = steps[i];
    if (step.type === "message_creation") {
      const msg_id = step.step_details.message_creation.message_id;
      const msg_data = await retrieve_message(thread_id, msg_id) as {role: string; content?: AssistantMessagePart[]};
      if (msg_data.role === "assistant") {
        let json_str = "";
        (msg_data.content || []).forEach((part: AssistantMessagePart) => {
          if (part.type === "text" && part.text?.value) {
            json_str += part.text.value;
          }
        });
        try {
          const response_obj = JSON.parse(json_str);
          return response_obj;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export async function run_assistant(thread_id: string, assistant_id=ASSISTANT_ID) {
  const run_obj = await create_run(thread_id, assistant_id);
  const run_id = run_obj.id;
  await wait_for_run_completion(thread_id, run_id);
  const message = await get_last_assistant_message(thread_id, run_id);
  return message;
}