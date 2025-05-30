import { useState } from 'react';
import axios from 'axios';

function App() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: "Hi! I'm your Sales Coach. Ask me anything about sales, and I'll give you tips and multiple solutions!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setMessages([...messages, { sender: 'user', text: input }]);
    setLoading(true);

    try {
      const response = await axios.post('/.netlify/functions/coach', { question: input });
      setMessages(msgs => [
        ...msgs,
        { sender: 'ai', text: response.data.answer }
      ]);
    } catch (err) {
      setMessages(msgs => [
        ...msgs,
        { sender: 'ai', text: "Sorry, I couldn't process your question. Please try again." }
      ]);
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white rounded-lg shadow-lg p-6 flex flex-col">
        <h1 className="text-3xl font-bold text-center mb-4 text-blue-700">AI Sales Coach</h1>
        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'}`}>
              <div className={`rounded-lg px-4 py-2 max-w-xs ${msg.sender === 'ai' ? 'bg-blue-100 text-blue-900' : 'bg-blue-600 text-white'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg px-4 py-2 bg-blue-100 text-blue-900 animate-pulse">Thinking...</div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            type="text"
            placeholder="Ask your sales question..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            disabled={loading}
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            onClick={sendMessage}
            disabled={loading}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App; 