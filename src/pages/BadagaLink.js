import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import './BadagaLink.css';

function BadagaLink() {
  const navigate = useNavigate();

  return (
    <main className="badaga-link-page">
      <header className="badaga-link-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <FaArrowLeft /> Back
        </button>
        <h1>Badaga Language</h1>
      </header>
      <iframe
        title="Badaga language learning website"
        src="https://adithyakanagu.github.io/badaga_type_learn/"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="badaga-link-frame"
      />
    </main>
  );
}

export default BadagaLink;
