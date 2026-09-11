import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaExternalLinkAlt } from 'react-icons/fa';

function BadagaLink() {
  const navigate = useNavigate();

  return (
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px', textAlign: 'center' }}>
      <button className="back-btn" onClick={() => navigate('/')}>
        <FaArrowLeft /> Back
      </button>
      <h1>Badaga Language</h1>
      <p>Learn and explore Badaga language resources.</p>
      <a
        className="login-button"
        href="https://adithyakanagu.github.io/badaga_type_learn/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Badaga Learning <FaExternalLinkAlt />
      </a>
    </main>
  );
}

export default BadagaLink;
