import { anthropic } from "@ai-sdk/anthropic";

const MODEL = "claude-haiku-4-5";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMessage = { role: string; content: any };

export class MockLanguageModel {
  readonly specificationVersion = "v2" as const;
  readonly provider = "mock";
  readonly modelId: string;
  readonly supportedUrls = {};

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  private async delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractUserPrompt(prompt: AnyMessage[]): string {
    for (let i = prompt.length - 1; i >= 0; i--) {
      const message = prompt[i];
      if (message.role === "user") {
        const content = message.content;
        if (Array.isArray(content)) {
          return content
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text)
            .join(" ");
        } else if (typeof content === "string") {
          return content;
        }
      }
    }
    return "";
  }

  private async *generateMockStream(
    prompt: AnyMessage[],
    userPrompt: string
  ): AsyncGenerator<any> {
    const toolMessageCount = prompt.filter((m) => m.role === "tool").length;

    const promptLower = userPrompt.toLowerCase();
    let componentType = "counter";
    let componentName = "Counter";

    if (promptLower.includes("form")) {
      componentType = "form";
      componentName = "ContactForm";
    } else if (promptLower.includes("card") || promptLower.includes("profile")) {
      componentType = "card";
      componentName = "Card";
    }

    // Step 0: Create App.jsx
    if (toolMessageCount === 0) {
      const text = `This is a static response. Add an Anthropic API key in the .env file to use the real API. Let me create a ${componentName} component.`;

      yield { type: "stream-start", warnings: [] };
      yield { type: "text-start", id: "text-1" };
      for (const char of text) {
        yield { type: "text-delta", id: "text-1", delta: char };
        await this.delay(15);
      }
      yield { type: "text-end", id: "text-1" };

      const appArgs = JSON.stringify({
        command: "create",
        path: "/App.jsx",
        file_text: this.getAppCode(componentName),
      });
      yield { type: "tool-input-start", id: "call_0", toolName: "str_replace_editor" };
      yield { type: "tool-input-delta", id: "call_0", delta: appArgs };
      yield { type: "tool-input-end", id: "call_0" };
      yield { type: "tool-call", toolCallId: "call_0", toolName: "str_replace_editor", input: appArgs };
      yield { type: "finish", finishReason: "tool-calls", usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 } };
      return;
    }

    // Step 1: Create component file
    if (toolMessageCount === 1) {
      const text = `I'll create a ${componentName} component for you.`;

      yield { type: "stream-start", warnings: [] };
      yield { type: "text-start", id: "text-1" };
      for (const char of text) {
        yield { type: "text-delta", id: "text-1", delta: char };
        await this.delay(25);
      }
      yield { type: "text-end", id: "text-1" };

      const compArgs = JSON.stringify({
        command: "create",
        path: `/components/${componentName}.jsx`,
        file_text: this.getComponentCode(componentType),
      });
      yield { type: "tool-input-start", id: "call_1", toolName: "str_replace_editor" };
      yield { type: "tool-input-delta", id: "call_1", delta: compArgs };
      yield { type: "tool-input-end", id: "call_1" };
      yield { type: "tool-call", toolCallId: "call_1", toolName: "str_replace_editor", input: compArgs };
      yield { type: "finish", finishReason: "tool-calls", usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 } };
      return;
    }

    // Final: done
    yield { type: "stream-start", warnings: [] };
    const finalText = `Done! The ${componentName} component is ready. You can see the preview on the right.`;
    yield { type: "text-start", id: "text-1" };
    for (const char of finalText) {
      yield { type: "text-delta", id: "text-1", delta: char };
      await this.delay(30);
    }
    yield { type: "text-end", id: "text-1" };
    yield { type: "finish", finishReason: "stop", usage: { inputTokens: 50, outputTokens: 50, totalTokens: 100 } };
  }

  private getComponentCode(componentType: string): string {
    switch (componentType) {
      case "form":
        return `import React, { useState } from 'react';

const ContactForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Thank you! We'll get back to you soon.");
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Contact Us</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea name="message" value={formData.message} onChange={handleChange} required rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors">
          Send Message
        </button>
      </form>
    </div>
  );
};

export default ContactForm;`;

      case "card":
        return `import React from 'react';

const Card = ({
  title = "Welcome to Our Service",
  description = "Discover amazing features and capabilities that will transform your experience.",
  imageUrl,
  actions
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {imageUrl && <img src={imageUrl} alt={title} className="w-full h-48 object-cover" />}
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        {actions && <div className="mt-4">{actions}</div>}
      </div>
    </div>
  );
};

export default Card;`;

      default:
        return `import { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Counter</h2>
      <div className="text-4xl font-bold mb-6">{count}</div>
      <div className="flex gap-4">
        <button onClick={() => setCount(c => c - 1)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">Decrease</button>
        <button onClick={() => setCount(0)} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">Reset</button>
        <button onClick={() => setCount(c => c + 1)} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">Increase</button>
      </div>
    </div>
  );
};

export default Counter;`;
    }
  }

  private getAppCode(componentName: string): string {
    if (componentName === "Card") {
      return `import Card from '@/components/Card';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Card
          title="Amazing Product"
          description="This is a fantastic product that will change your life. Experience the difference today!"
          actions={<button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors">Learn More</button>}
        />
      </div>
    </div>
  );
}`;
    }

    return `import ${componentName} from '@/components/${componentName}';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <${componentName} />
      </div>
    </div>
  );
}`;
  }

  async doGenerate(options: { prompt: AnyMessage[] }) {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const parts: any[] = [];
    for await (const part of this.generateMockStream(options.prompt, userPrompt)) {
      parts.push(part);
    }

    const textParts = parts.filter((p) => p.type === "text-delta").map((p) => p.delta).join("");
    const toolCalls = parts
      .filter((p) => p.type === "tool-call")
      .map((p) => ({ type: "tool-call" as const, toolCallId: p.toolCallId, toolName: p.toolName, input: p.input }));

    const finishPart = parts.find((p) => p.type === "finish");
    const finishReason = finishPart?.finishReason ?? "stop";

    const content: any[] = [];
    if (textParts) content.push({ type: "text", text: textParts });
    content.push(...toolCalls);

    return {
      content,
      finishReason,
      usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 },
      warnings: [],
    };
  }

  async doStream(options: { prompt: AnyMessage[] }) {
    const userPrompt = this.extractUserPrompt(options.prompt);
    const self = this;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of self.generateMockStream(options.prompt, userPrompt)) {
            controller.enqueue(chunk);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return { stream };
  }
}

export function getLanguageModel() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    console.log("No ANTHROPIC_API_KEY found, using mock provider");
    return new MockLanguageModel("mock-claude-sonnet-4-0");
  }

  return anthropic(MODEL);
}
