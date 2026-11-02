import React, { useEffect, useMemo, useState } from 'react';
import { FaEnvelope, FaPaperPlane, FaComments } from 'react-icons/fa';
import { ADMIN_EMAIL, loadAppData, sendConversationMessage, sendEmailMessage } from '../data/store';
import { useAuth } from '../context/AuthContext';
import './CommunicationCenter.css';

function CommunicationCenter({ isAdmin = false, selectedMessage = null }) {
  const { user } = useAuth();
  const [data, setData] = useState(loadAppData);
  const [activeMode, setActiveMode] = useState('conversation');
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const syncData = () => setData(loadAppData());
    window.addEventListener('storage', syncData);
    window.addEventListener('arSmartTourismDataUpdated', syncData);
    return () => {
      window.removeEventListener('storage', syncData);
      window.removeEventListener('arSmartTourismDataUpdated', syncData);
    };
  }, []);

  const contactEmails = useMemo(() => {
    const candidates = [
      ...(data.messages || []).flatMap((message) => [message.fromEmail, message.toEmail]),
      ...(data.inquiries || []).map((inquiry) => inquiry.userEmail),
      ...(data.forms || []).map((form) => form.targetEmail),
      ...(data.orders || []).map((order) => order.userEmail)
    ];
    return [...new Set(candidates
      .map((email) => String(email || '').trim().toLowerCase())
      .filter((email) => email && email !== ADMIN_EMAIL.toLowerCase()))];
  }, [data]);

  useEffect(() => {
    if (!isAdmin && recipient !== ADMIN_EMAIL) setRecipient(ADMIN_EMAIL);
  }, [isAdmin, recipient]);

  useEffect(() => {
    if (!selectedMessage) return;
    setRecipient(selectedMessage.fromEmail || '');
    setActiveMode(selectedMessage.channel === 'email' ? 'email' : 'conversation');
  }, [selectedMessage]);

  const visibleMessages = useMemo(() => {
    const peerEmail = isAdmin ? recipient.trim().toLowerCase() : ADMIN_EMAIL.toLowerCase();
    if (!peerEmail) return [];
    return (data.messages || [])
      .filter((message) => message.channel === activeMode && (
        (String(message.fromEmail).toLowerCase() === peerEmail && String(message.toEmail).toLowerCase() === String(user?.email).toLowerCase()) ||
        (String(message.toEmail).toLowerCase() === peerEmail && String(message.fromEmail).toLowerCase() === String(user?.email).toLowerCase())
      ))
      .slice()
      .reverse();
  }, [activeMode, data.messages, isAdmin, recipient, user?.email]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const payload = { toEmail: isAdmin ? recipient.trim() : ADMIN_EMAIL };
      if (activeMode === 'email') {
        await sendEmailMessage({ ...payload, subject, body });
      } else {
        await sendConversationMessage({ ...payload, body });
      }
      setData(loadAppData());
      setBody('');
      if (activeMode === 'email') setSubject('');
      setSuccess(activeMode === 'email' ? 'Email delivery was confirmed by the configured provider.' : 'Message sent.');
    } catch (sendError) {
      setError(sendError.message || 'The message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="communication-panel" aria-label="Mail and conversations">
      <header className="communication-heading">
        <div>
          <h2>{isAdmin ? 'Mail & user messages' : 'Contact Nilgiris Tourism'}</h2>
          <p>{isAdmin ? 'Choose a communication type, enter the user’s email, and view the conversation history.' : 'Send an in-app message or an email to the Nilgiris Tourism admin.'}</p>
        </div>
      </header>

      <div className="communication-mode-tabs" role="tablist" aria-label="Communication type">
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'conversation'}
          className={activeMode === 'conversation' ? 'active' : ''}
          onClick={() => { setActiveMode('conversation'); setError(''); setSuccess(''); }}
        >
          <FaComments /> In-app message
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'email'}
          className={activeMode === 'email' ? 'active' : ''}
          onClick={() => { setActiveMode('email'); setError(''); setSuccess(''); }}
        >
          <FaEnvelope /> Email
        </button>
      </div>

      <div className="communication-thread" aria-live="polite">
        {visibleMessages.length ? visibleMessages.map((message) => {
          const ownMessage = String(message.fromEmail).toLowerCase() === String(user?.email).toLowerCase();
          return (
            <article key={message.id} className={`communication-message ${ownMessage ? 'own' : ''}`}>
              <div className="communication-message-meta">
                <strong>{ownMessage ? 'You' : message.fromEmail}</strong>
                <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString()}</time>
              </div>
              {message.subject && <strong className="communication-message-subject">{message.subject}</strong>}
              <p>{message.body}</p>
            </article>
          );
        }) : (
          <p className="communication-empty">
            {activeMode === 'email' ? 'No emails sent in this thread yet.' : 'No messages in this conversation yet.'}
          </p>
        )}
      </div>

      <form className="communication-compose" onSubmit={handleSend}>
        <label className="communication-recipient">
          {isAdmin ? 'To — user email' : 'To'}
          <input
            type="email"
            list={isAdmin ? 'communication-contact-list' : undefined}
            value={isAdmin ? recipient : ADMIN_EMAIL}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder={isAdmin ? 'Enter the recipient’s email address' : undefined}
            readOnly={!isAdmin}
            aria-label={isAdmin ? 'Recipient email address' : 'Admin email address'}
            required
            autoComplete="email"
          />
          {isAdmin && (
            <>
              <small>Enter an email address or choose an existing contact.</small>
              <datalist id="communication-contact-list">
                {contactEmails.map((email) => <option key={email} value={email} />)}
              </datalist>
            </>
          )}
        </label>
        {activeMode === 'email' && (
          <label>
            Email subject
            <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength="120" required />
          </label>
        )}
        <label>
          {activeMode === 'email' ? 'Email message' : 'Message'}
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength="4000"
            rows="4"
            placeholder={activeMode === 'email' ? 'Write your email…' : 'Write your in-app message…'}
            required
          />
        </label>
        {error && <p className="communication-feedback error" role="alert">{error}</p>}
        {success && <p className="communication-feedback success" role="status">{success}</p>}
        <button type="submit" disabled={sending || !body.trim() || (isAdmin && !recipient.trim())}>
          <FaPaperPlane /> {sending ? 'Sending…' : activeMode === 'email' ? 'Send email' : 'Send message'}
        </button>
      </form>
    </section>
  );
}

export default CommunicationCenter;
