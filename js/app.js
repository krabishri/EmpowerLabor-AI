/**
 * Job Mentor Agent — Main Chat Interface JS
 * Handles: chat, voice input, mode switching, profile, accessibility
 */

"use strict";

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  currentMode:  "CHAT",
  isListening:  false,
  isSending:    false,
  recognition:  null,
  profile:      {},
};

// ── DOM References ────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const chatMessages   = $("chatMessages");
const chatInput      = $("chatInput");
const sendBtn        = $("sendBtn");
const micBtn         = $("micBtn");
const micIcon        = $("micIcon");
const micRipple      = $("micRipple");
const typingIndicator = $("typingIndicator");
const agentStatus    = $("agentStatus");
const statusText     = $("statusText");
const currentModeBadge = $("currentModeBadge");
const clearChatBtn   = $("clearChatBtn");
const profileForm    = $("profileForm");
const profileSaved   = $("profileSaved");
const voiceStatus    = $("voiceStatus");
const voiceStatusText = $("voiceStatusText");
const contrastToggle = $("contrastToggle");
const fontToggle     = $("fontToggle");

// ── Accessibility: Contrast & Font toggles ────────────────────────────────────
function initAccessibility() {
  const savedTheme = localStorage.getItem("jma-theme") || "light";
  const savedFont  = localStorage.getItem("jma-font")  || "normal";
  document.documentElement.setAttribute("data-theme", savedTheme);
  document.documentElement.setAttribute("data-font",  savedFont);

  contrastToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "high-contrast" ? "light" : "high-contrast";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("jma-theme", next);
    contrastToggle.setAttribute("aria-label",
      next === "high-contrast" ? "Switch to normal mode" : "Toggle high contrast mode");
    announceToSR(next === "high-contrast" ? "High contrast mode on" : "High contrast mode off");
  });

  fontToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-font");
    const next = current === "large" ? "normal" : "large";
    document.documentElement.setAttribute("data-font", next);
    localStorage.setItem("jma-font", next);
    fontToggle.setAttribute("aria-label",
      next === "large" ? "Switch to normal text size" : "Toggle large text");
    announceToSR(next === "large" ? "Large text mode on" : "Normal text size");
  });
}

// ── Screen reader announcer ───────────────────────────────────────────────────
let srAnnouncer = null;
function announceToSR(message) {
  if (!srAnnouncer) {
    srAnnouncer = document.createElement("div");
    srAnnouncer.setAttribute("aria-live", "assertive");
    srAnnouncer.setAttribute("aria-atomic", "true");
    srAnnouncer.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden";
    document.body.appendChild(srAnnouncer);
  }
  srAnnouncer.textContent = "";
  setTimeout(() => { srAnnouncer.textContent = message; }, 50);
}

// ── Mode Selector ─────────────────────────────────────────────────────────────
function initModeSelector() {
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".mode-btn").forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      state.currentMode = btn.dataset.mode;
      const modeLabels = {
        CHAT:      "MENTOR CHAT",
        JOB_MATCH: "JOB MATCH",
        UPSKILL:   "UPSKILL",
        WELFARE:   "WELFARE",
      };
      currentModeBadge.textContent = modeLabels[state.currentMode] || state.currentMode;
      announceToSR(`Mode changed to ${modeLabels[state.currentMode]}`);
      chatInput.placeholder = {
        CHAT:      "Ask me anything about jobs, careers, or work opportunities...",
        JOB_MATCH: "Describe what kind of work you're looking for...",
        UPSKILL:   "What skills would you like to learn or improve?",
        WELFARE:   "Ask about government schemes, eligibility, or how to apply...",
      }[state.currentMode] || "Ask me anything...";
      chatInput.focus();
    });
  });
}

// ── Quick Prompts ─────────────────────────────────────────────────────────────
function initQuickPrompts() {
  document.querySelectorAll(".quick-prompt-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const prompt = btn.dataset.prompt;
      if (prompt) {
        chatInput.value = prompt;
        autoResizeTextarea(chatInput);
        chatInput.focus();
        sendMessage();
      }
    });
  });
}

// ── Profile Form ──────────────────────────────────────────────────────────────
function initProfile() {
  // Load saved profile on start
  fetch("/api/profile")
    .then(r => r.json())
    .then(profile => {
      state.profile = profile;
      if (profile.name)       $("pName").value       = profile.name;
      if (profile.location)   $("pLocation").value   = profile.location;
      if (profile.occupation) $("pOccupation").value = profile.occupation;
      if (profile.skills)     $("pSkills").value      = profile.skills;
      if (profile.education)  $("pEducation").value  = profile.education;
      if (profile.languages)  $("pLanguages").value  = profile.languages;
      if (profile.sector)     $("pSector").value      = profile.sector;
    })
    .catch(() => {});

  profileForm.addEventListener("submit", e => {
    e.preventDefault();
    const profile = {
      name:       $("pName").value.trim(),
      location:   $("pLocation").value.trim(),
      occupation: $("pOccupation").value.trim(),
      skills:     $("pSkills").value.trim(),
      education:  $("pEducation").value,
      languages:  $("pLanguages").value.trim(),
      sector:     $("pSector").value,
    };
    fetch("/api/profile", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(profile),
    })
      .then(r => r.json())
      .then(() => {
        state.profile = profile;
        profileSaved.hidden = false;
        setTimeout(() => { profileSaved.hidden = true; }, 3000);
        announceToSR("Profile saved successfully");
      })
      .catch(() => {
        announceToSR("Failed to save profile. Please try again.");
      });
  });
}

// ── Chat: Send Message ────────────────────────────────────────────────────────
async function sendMessage(message) {
  const text = (message || chatInput.value).trim();
  if (!text || state.isSending) return;

  state.isSending = true;
  sendBtn.disabled = true;
  chatInput.value = "";
  autoResizeTextarea(chatInput);

  // Add user message
  appendMessage("user", text, state.currentMode);

  // Show typing
  showTyping(true);
  setStatus("thinking", "Thinking...");

  try {
    const res = await fetch("/api/chat", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ message: text, mode: state.currentMode }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      appendMessage("assistant", data.message || "Sorry, something went wrong. Please try again.", "ERROR");
    } else {
      appendMessage("assistant", data.response, data.mode || state.currentMode, data.timestamp);
    }
  } catch (err) {
    appendMessage("assistant",
      "I'm having trouble connecting right now. Please check your internet connection and try again.", "ERROR");
  } finally {
    showTyping(false);
    setStatus("ready", "Ready to help");
    state.isSending = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

function appendMessage(role, content, mode, timestamp) {
  const isAgent = role === "assistant";
  const row = document.createElement("div");
  row.className = `message-row ${isAgent ? "agent-row" : "user-row"}`;
  row.setAttribute("role", "article");
  row.setAttribute("aria-label", `${isAgent ? "Mentor" : "You"} said`);

  const avatar = document.createElement("div");
  if (isAgent) {
    avatar.className = "msg-avatar agent-avatar-sm";
    avatar.textContent = "🤖";
    avatar.setAttribute("aria-hidden", "true");
  } else {
    avatar.className = "msg-avatar user-avatar-sm";
    avatar.textContent = "👤";
    avatar.setAttribute("aria-hidden", "true");
  }

  const bubble = document.createElement("div");
  bubble.className = `msg-bubble ${isAgent ? "agent-bubble" : "user-bubble"}`;

  // Convert markdown-lite to HTML for agent responses
  const formattedContent = isAgent ? formatContent(content) : escapeHtml(content);
  bubble.innerHTML = formattedContent;

  // Meta row
  const meta = document.createElement("div");
  meta.className = "msg-meta";
  const timeEl = document.createElement("span");
  timeEl.className = "msg-time";
  timeEl.textContent = formatTime(timestamp);
  const modeEl = document.createElement("span");
  modeEl.className = "msg-mode";
  modeEl.textContent = mode || state.currentMode;
  meta.appendChild(timeEl);
  meta.appendChild(modeEl);
  bubble.appendChild(meta);

  row.appendChild(avatar);
  row.appendChild(bubble);
  chatMessages.appendChild(row);
  scrollToBottom();
  if (isAgent) announceToSR("New response from mentor received");
}

function formatContent(text) {
  // Basic markdown-like formatting
  let html = escapeHtml(text);
  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Headers: ### text
  html = html.replace(/^### (.+)$/gm, "<h4 style='font-size:14px;font-weight:700;margin:12px 0 6px'>$1</h4>");
  html = html.replace(/^## (.+)$/gm,  "<h3 style='font-size:15px;font-weight:700;margin:14px 0 6px'>$1</h3>");
  html = html.replace(/^# (.+)$/gm,   "<h2 style='font-size:16px;font-weight:700;margin:14px 0 6px'>$1</h2>");
  // Bullet lists: - text or * text
  html = html.replace(/^[*\-] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>(\n|$))+/g, match => `<ul style="padding-left:18px;margin:8px 0">${match}</ul>`);
  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  // Line breaks
  html = html.replace(/\n\n+/g, "</p><p style='margin:0 0 8px'>");
  html = html.replace(/\n/g, "<br>");
  return `<p style="margin:0 0 8px">${html}</p>`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(isoString) {
  try {
    const d = isoString ? new Date(isoString) : new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}

function showTyping(show) {
  typingIndicator.hidden = !show;
  if (show) scrollToBottom();
}

function setStatus(status, text) {
  statusText.textContent = text;
  const dot = agentStatus.querySelector(".status-dot");
  if (dot) {
    dot.style.background = status === "thinking" ? "#f59e0b" : "#22c55e";
  }
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ── Chat Input: Auto-resize & keyboard ───────────────────────────────────────
function autoResizeTextarea(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 140) + "px";
}

function initChatInput() {
  chatInput.addEventListener("input",   () => autoResizeTextarea(chatInput));
  chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  sendBtn.addEventListener("click", () => sendMessage());
  clearChatBtn.addEventListener("click", async () => {
    if (!confirm("Clear all chat history?")) return;
    await fetch("/api/clear-history", { method: "POST" });
    chatMessages.innerHTML = "";
    appendMessage("assistant",
      "Chat history cleared. How can I help you today?", "CHAT");
    announceToSR("Chat history cleared");
  });
}

// ── Voice Input (Web Speech API) ──────────────────────────────────────────────
function initVoiceInput() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    micBtn.title = "Voice input not supported in this browser";
    micBtn.style.opacity = "0.5";
    micBtn.setAttribute("aria-label", "Voice input not supported");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous    = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  // Use user's language preference or default to auto-detect
  recognition.lang = navigator.language || "en-IN";
  state.recognition = recognition;

  recognition.onstart = () => {
    state.isListening = true;
    micBtn.classList.add("listening");
    micBtn.setAttribute("aria-pressed", "true");
    micBtn.setAttribute("aria-label", "Stop voice input");
    micIcon.className = "bi bi-mic-mute-fill";
    voiceStatus.hidden = false;
    voiceStatusText.textContent = "Listening... Speak now";
    announceToSR("Voice input started. Speak now.");
  };

  recognition.onresult = e => {
    const transcript = Array.from(e.results)
      .map(r => r[0].transcript)
      .join("");
    chatInput.value = transcript;
    autoResizeTextarea(chatInput);
    if (e.results[e.results.length - 1].isFinal) {
      voiceStatusText.textContent = `Heard: "${transcript}"`;
    } else {
      voiceStatusText.textContent = `Hearing: "${transcript}"`;
    }
  };

  recognition.onend = () => {
    state.isListening = false;
    micBtn.classList.remove("listening");
    micBtn.setAttribute("aria-pressed", "false");
    micBtn.setAttribute("aria-label", "Start voice input");
    micIcon.className = "bi bi-mic-fill";
    voiceStatus.hidden = true;
    announceToSR("Voice input stopped.");
    // Auto-send if there's text
    if (chatInput.value.trim()) {
      setTimeout(() => sendMessage(), 300);
    }
  };

  recognition.onerror = e => {
    state.isListening = false;
    micBtn.classList.remove("listening");
    micIcon.className = "bi bi-mic-fill";
    voiceStatus.hidden = true;
    const errors = {
      "not-allowed":  "Microphone permission denied. Please allow microphone access.",
      "no-speech":    "No speech detected. Please try again.",
      "network":      "Network error during voice recognition.",
      "aborted":      "Voice input cancelled.",
    };
    const msg = errors[e.error] || `Voice error: ${e.error}`;
    announceToSR(msg);
    // Show brief error in chat
    if (e.error !== "aborted" && e.error !== "no-speech") {
      appendMessage("assistant", msg, "INFO");
    }
  };

  micBtn.addEventListener("click", () => {
    if (state.isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        announceToSR("Could not start voice input. Please try again.");
      }
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initAccessibility();
  initModeSelector();
  initQuickPrompts();
  initProfile();
  initChatInput();
  initVoiceInput();
  chatInput.focus();

  // Health check on load
  fetch("/api/health")
    .then(r => r.json())
    .then(data => {
      if (!data.watsonx_configured) {
        appendMessage("assistant",
          "⚠️ **Configuration needed**: WATSONX_API_KEY and WATSONX_PROJECT_ID are not set. " +
          "Please copy `.env.example` to `.env` and add your IBM Cloud credentials to start using the agent.",
          "SYSTEM");
      }
    })
    .catch(() => {});
});
