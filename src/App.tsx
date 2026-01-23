import React, { useState } from "react";
import { initializeIcons, Modal } from "@fluentui/react";
import "./App.css";
import { Board } from "./components/Board/Board";

initializeIcons();

function App() {
  const [isModalOpen, setIsModalOpen] = useState(true);

  const dismissModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Board />
      <Modal
        isOpen={isModalOpen}
        onDismiss={dismissModal}
        isBlocking={false}
        styles={{
          main: {
            background: "#121419",
            borderRadius: "20px",
            padding: "30px 40px",
            maxWidth: "450px",
            textAlign: "center",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          },
        }}
      >
        <div style={{ color: "white" }}>
          <h2
            style={{
              margin: "0 0 15px 0",
              background: "linear-gradient(45deg, #4039ad, #0e8ecc)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontSize: "24px",
            }}
          >
            New Version Available!
          </h2>
          <p
            style={{
              margin: "0 0 25px 0",
              fontSize: "16px",
              lineHeight: "1.5",
              color: "rgba(255, 255, 255, 0.85)",
            }}
          >
            A new and improved version of Graphisual is now available{" "}
            <a
              href="https://graphisual.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#0e8ecc",
                fontWeight: "bold",
                textDecoration: "underline",
              }}
            >
              here
            </a>
            .
          </p>
          <button
            onClick={dismissModal}
            style={{
              backgroundImage: "linear-gradient(45deg, #2a7cd0, #7e5aea)",
              color: "white",
              fontWeight: "bold",
              border: "none",
              borderRadius: "5px",
              padding: "10px 30px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Got it!
          </button>
        </div>
      </Modal>
    </>
  );
}

export default App;
