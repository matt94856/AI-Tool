import { useState } from 'react';
import axios from 'axios';

function App() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: "Hi! I'm your Sales Coach. Ask me anything about sales, and I'll give you tips and multiple solutions!", tips: '', feedback: '' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Build conversation history for backend, skipping the initial AI greeting
  const getHistory = () => {
    const history = [];
    for (let i = 1; i < messages.length; i++) {
      if (messages[i - 1] && messages[i]) {
        if (messages[i - 1].sender === 'user') {
          history.push({
            user: messages[i - 1].text,
            ai: messages[i].text,
          });
        }
      }
    }
    return history.filter(turn => turn.user && turn.ai);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { sender: 'user', text: input }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await axios.post('/.netlify/functions/coach', {
        question: input,
        history: getHistory(),
        summaryMode: false,
      });
      setMessages(msgs => [
        ...msgs,
        {
          sender: 'ai',
          text: response.data.reply || '',
          tips: response.data.tips || '',
          feedback: response.data.feedback || '',
        }
      ]);
    } catch (err) {
      setMessages(msgs => [
        ...msgs,
        { sender: 'ai', text: "Sorry, I couldn't process your question. Please try again.", tips: '', feedback: '' }
      ]);
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const requestSummary = async () => {
    setSummaryLoading(true);
    try {
      const response = await axios.post('/.netlify/functions/coach', {
        question: '',
        history: getHistory(),
        summaryMode: true,
      });
      setSummary(response.data.summary || 'No summary available.');
    } catch (err) {
      setSummary('Could not generate summary.');
    } finally {
      setSummaryLoading(false);
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
                {/* Advanced section for AI messages */}
                {msg.sender === 'ai' && (msg.tips || msg.feedback) && (
                  <div className="mt-2">
                    <button
                      className="text-xs text-blue-700 underline focus:outline-none"
                      onClick={() => setShowAdvanced(v => !v)}
                    >
                      {showAdvanced ? 'Hide' : 'Show'} Advanced Sales Tips & Feedback
                    </button>
                    {showAdvanced && (
                      <div className="mt-2 border border-blue-300 bg-blue-50 rounded p-3 text-sm space-y-2">
                        {msg.tips && (
                          <div>
                            <div className="font-semibold text-blue-800 mb-1">Advanced Sales Tips</div>
                            <div dangerouslySetInnerHTML={{ __html: msg.tips.replace(/\n/g, '<br/>') }} />
                          </div>
                        )}
                        {msg.feedback && (
                          <div>
                            <div className="font-semibold text-blue-800 mb-1">Negotiation Tactic Feedback</div>
                            <div dangerouslySetInnerHTML={{ __html: msg.feedback.replace(/\n/g, '<br/>') }} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg px-4 py-2 bg-blue-100 text-blue-900 animate-pulse">Thinking...</div>
            </div>
          )}
        </div>
        <div className="flex gap-2 mb-2">
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
        <div className="flex justify-end mb-2">
          <button
            className="text-xs text-blue-700 underline focus:outline-none"
            onClick={requestSummary}
            disabled={summaryLoading}
          >
            {summaryLoading ? 'Summarizing...' : 'Show Conversation Summary'}
          </button>
        </div>
        {summary && (
          <div className="border border-green-400 bg-green-50 rounded p-4 text-sm mt-2">
            <div className="font-semibold text-green-800 mb-1">Negotiation Debrief</div>
            <div>{summary}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 