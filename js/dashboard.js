/**
 * Job Mentor Agent — Dashboard JS
 * Handles: job matching, upskilling, welfare, voice profile, accessibility
 */

"use strict";

const $ = id => document.getElementById(id);

// ── Accessibility ─────────────────────────────────────────────────────────────
function initAccessibility() {
  const savedTheme = localStorage.getItem("jma-theme") || "light";
  const savedFont  = localStorage.getItem("jma-font")  || "normal";
  document.documentElement.setAttribute("data-theme", savedTheme);
  document.documentElement.setAttribute("data-font",  savedFont);

  $("contrastToggle").addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "high-contrast" ? "light" : "high-contrast";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("jma-theme", next);
    announceToSR(next === "high-contrast" ? "High contrast mode on" : "High contrast mode off");
  });

  $("fontToggle").addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-font");
    const next = current === "large" ? "normal" : "large";
    document.documentElement.setAttribute("data-font", next);
    localStorage.setItem("jma-font", next);
    announceToSR(next === "large" ? "Large text mode on" : "Normal text size");
  });
}

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

// ── Load Profile ──────────────────────────────────────────────────────────────
function loadProfile() {
  fetch("/api/profile")
    .then(r => r.json())
    .then(profile => {
      if (profile.name) {
        $("bannerName").textContent = profile.name;
      }
      const locEl  = $("bannerLocation");
      const occEl  = $("bannerOccupation");
      const locInput = $("jobLocation");

      if (profile.location) {
        locEl.innerHTML = `<i class="bi bi-geo-alt" aria-hidden="true"></i> ${escapeHtml(profile.location)}`;
        if (locInput && !locInput.value) locInput.value = profile.location;
      }
      if (profile.occupation) {
        occEl.innerHTML = `<i class="bi bi-briefcase" aria-hidden="true"></i> ${escapeHtml(profile.occupation)}`;
      }
      if (profile.sector) {
        const sectorEl = $("jobSector");
        if (sectorEl && !sectorEl.value) sectorEl.value = profile.sector;
      }
    })
    .catch(() => {});
}

// ── Escaping ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ── Format AI Response ────────────────────────────────────────────────────────
function formatResponse(text) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/^### (.+)$/gm, "<h4 style='font-size:13px;font-weight:700;margin:10px 0 4px;color:#1f2328'>$1</h4>");
  html = html.replace(/^## (.+)$/gm,  "<h3 style='font-size:14px;font-weight:700;margin:12px 0 6px;color:#1f2328'>$1</h3>");
  html = html.replace(/^[*\-] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>(\n|$))+/g, match =>
    `<ul style="padding-left:16px;margin:6px 0">${match}</ul>`);
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  html = html.replace(/\n\n+/g, "</p><p style='margin:0 0 6px'>");
  html = html.replace(/\n/g, "<br>");
  return `<p style="margin:0 0 6px">${html}</p>`;
}

function showLoader(loaderId, resultId, show) {
  $(loaderId).hidden = !show;
  if (show) $(resultId).hidden = true;
}

function showResult(resultId, loaderId, html) {
  $(loaderId).hidden = true;
  const el = $(resultId);
  el.innerHTML = html;
  el.hidden = false;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ── Job Matching ──────────────────────────────────────────────────────────────
function initJobMatching() {
  $("findJobsBtn").addEventListener("click", async () => {
    const location = $("jobLocation").value.trim();
    const sector   = $("jobSector").value;
    const query    = `Find suitable daily-wage and gig jobs${location ? ` near ${location}` : ""}${sector ? ` in the ${sector} sector` : ""}. Provide full job parameters including daily wage in INR.`;

    showLoader("jobMatchLoader", "jobMatchResult", true);
    $("findJobsBtn").disabled = true;
    announceToSR("Finding job matches...");

    try {
      const res  = await fetch("/api/job-match", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query, location, sector }),
      });
      const data = await res.json();

      if (data.error) {
        showResult("jobMatchResult", "jobMatchLoader",
          `<p style="color:#dc2626">⚠️ ${escapeHtml(data.error)}</p>`);
      } else {
        showResult("jobMatchResult", "jobMatchLoader", formatResponse(data.matches));
        $("statJobMatches").textContent = "✓";
        announceToSR("Job matches found. Review the results.");
      }
    } catch {
      showResult("jobMatchResult", "jobMatchLoader",
        `<p style="color:#dc2626">⚠️ Connection error. Please try again.</p>`);
    } finally {
      $("findJobsBtn").disabled = false;
    }
  });
}

// ── Upskilling Roadmap ────────────────────────────────────────────────────────
function initUpskilling() {
  $("getCoursesBtn").addEventListener("click", async () => {
    const goal = $("upskillGoal").value;
    const query = goal
      ? `Create a 3-step upskilling roadmap for someone who wants to ${goal}. Map each step to a specific free course from IBM SkillsBuild, PMKVY, or NSDC.`
      : "Create a personalized 3-step upskilling roadmap to improve my income and job prospects with free courses.";

    showLoader("upskillLoader", "upskillResult", true);
    $("courseTracker").hidden = true;
    $("getCoursesBtn").disabled = true;
    announceToSR("Building your upskilling roadmap...");

    try {
      const res  = await fetch("/api/upskill", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query }),
      });
      const data = await res.json();

      if (data.error) {
        showResult("upskillResult", "upskillLoader",
          `<p style="color:#dc2626">⚠️ ${escapeHtml(data.error)}</p>`);
      } else {
        showResult("upskillResult", "upskillLoader", formatResponse(data.recommendations));
        buildCourseTracker(data.recommendations);
        $("statCourses").textContent = "✓";
        announceToSR("Upskilling roadmap ready. Review your learning path.");
      }
    } catch {
      showResult("upskillResult", "upskillLoader",
        `<p style="color:#dc2626">⚠️ Connection error. Please try again.</p>`);
    } finally {
      $("getCoursesBtn").disabled = false;
    }
  });
}

function buildCourseTracker(responseText) {
  // Try to extract up to 3 steps from the AI response
  const steps = [];
  const lines = responseText.split("\n").filter(l => l.trim());
  const stepRegex = /^(step\s*[1-3]|[1-3][\.\):]|\*\s*step|##?\s*step)/i;

  for (const line of lines) {
    if (stepRegex.test(line.trim()) && steps.length < 3) {
      steps.push(line.replace(/^[#*\-\d\.:\)]+\s*/g, "").trim());
    }
  }

  // If we couldn't parse steps, create generic ones
  if (steps.length === 0) {
    steps.push("Step 1: Learn foundational skills", "Step 2: Practice and apply", "Step 3: Get certified");
  }

  const container = $("courseSteps");
  container.innerHTML = "";

  steps.forEach((step, i) => {
    const div = document.createElement("div");
    div.className = "course-step";
    div.innerHTML = `
      <div class="step-num" id="stepNum${i}">${i + 1}</div>
      <div class="step-content">
        <div class="step-title">${escapeHtml(step.substring(0, 80))}${step.length > 80 ? "..." : ""}</div>
        <div class="step-desc">Tap ✓ when you complete this step</div>
      </div>
      <button class="step-check" id="stepCheck${i}" aria-label="Mark step ${i + 1} as complete" title="Mark complete">
        <i class="bi bi-check" aria-hidden="true"></i>
      </button>
    `;
    const checkBtn = div.querySelector(`#stepCheck${i}`);
    const numEl    = div.querySelector(`#stepNum${i}`);
    checkBtn.addEventListener("click", () => {
      const isDone = checkBtn.classList.toggle("checked");
      checkBtn.setAttribute("aria-label", isDone ? `Step ${i + 1} completed` : `Mark step ${i + 1} as complete`);
      if (isDone) numEl.classList.add("done");
      else        numEl.classList.remove("done");
      announceToSR(isDone ? `Step ${i + 1} marked as complete` : `Step ${i + 1} marked as incomplete`);
    });
    container.appendChild(div);
  });

  $("courseTracker").hidden = false;
}

// ── Welfare Eligibility ───────────────────────────────────────────────────────
function initWelfare() {
  // Filter buttons
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  $("checkWelfareBtn").addEventListener("click", async () => {
    const activeFilter = document.querySelector(".filter-btn.active")?.dataset.scheme || "all";
    const schemeTypeMap = {
      all:        "all available government welfare schemes",
      income:     "income support and financial assistance schemes",
      housing:    "housing and shelter schemes like PM Awas Yojana",
      health:     "healthcare schemes like Ayushman Bharat",
      loan:       "micro-loan schemes like PM SVANidhi",
      employment: "employment guarantee schemes like MGNREGS and PMKVY",
    };
    const query = `Check my eligibility for ${schemeTypeMap[activeFilter]} based on my profile. Explain each scheme in simple language with who qualifies, documents needed, how to apply, and benefit amount.`;

    showLoader("welfareLoader", "welfareResult", true);
    $("checkWelfareBtn").disabled = true;
    announceToSR("Checking welfare eligibility...");

    try {
      const res  = await fetch("/api/welfare", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query }),
      });
      const data = await res.json();

      if (data.error) {
        showResult("welfareResult", "welfareLoader",
          `<p style="color:#dc2626">⚠️ ${escapeHtml(data.error)}</p>`);
      } else {
        showResult("welfareResult", "welfareLoader", formatResponse(data.eligibility));
        $("statWelfare").textContent = "✓";
        announceToSR("Welfare eligibility check complete. Review your results.");
      }
    } catch {
      showResult("welfareResult", "welfareLoader",
        `<p style="color:#dc2626">⚠️ Connection error. Please try again.</p>`);
    } finally {
      $("checkWelfareBtn").disabled = false;
    }
  });
}

// ── Voice Profile (Dashboard) ─────────────────────────────────────────────────
function initVoiceProfile() {
  const dashMicBtn    = $("dashMicBtn");
  const dashMicIcon   = $("dashMicIcon");
  const dashMicLabel  = $("dashMicLabel");
  const dashVoiceStatus = $("dashVoiceStatus");
  const dashVoiceText = $("dashVoiceText");
  const dashTranscript = $("dashTranscript");
  const dashTranscriptText = $("dashTranscriptText");
  const sendTranscriptBtn  = $("sendTranscriptBtn");

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    dashMicBtn.disabled = true;
    dashMicLabel.textContent = "Not supported";
    dashMicBtn.title = "Voice input requires Chrome or Edge browser";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous     = false;
  recognition.interimResults = true;
  recognition.lang           = navigator.language || "en-IN";

  let isListening = false;

  recognition.onstart = () => {
    isListening = true;
    dashMicBtn.classList.add("listening");
    dashMicBtn.setAttribute("aria-pressed", "true");
    dashMicIcon.className = "bi bi-mic-mute-fill";
    dashMicLabel.textContent = "Listening...";
    dashVoiceStatus.hidden = false;
    dashVoiceText.textContent = "Listening... Speak now";
    dashTranscript.hidden = true;
    announceToSR("Voice input started on dashboard.");
  };

  recognition.onresult = e => {
    const transcript = Array.from(e.results)
      .map(r => r[0].transcript).join("");
    dashVoiceText.textContent = `Hearing: "${transcript}"`;
    dashTranscriptText.textContent = transcript;
    dashTranscript.hidden = false;
    if (e.results[e.results.length - 1].isFinal) {
      sendTranscriptBtn.hidden = false;
    }
  };

  recognition.onend = () => {
    isListening = false;
    dashMicBtn.classList.remove("listening");
    dashMicBtn.setAttribute("aria-pressed", "false");
    dashMicIcon.className = "bi bi-mic-fill";
    dashMicLabel.textContent = "Tap to Speak";
    dashVoiceStatus.hidden = true;
    announceToSR("Voice input stopped.");
  };

  recognition.onerror = e => {
    isListening = false;
    dashMicBtn.classList.remove("listening");
    dashMicIcon.className = "bi bi-mic-fill";
    dashMicLabel.textContent = "Tap to Speak";
    dashVoiceStatus.hidden = true;
    if (e.error === "not-allowed") {
      announceToSR("Microphone permission denied.");
    }
  };

  dashMicBtn.addEventListener("click", () => {
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  });

  // Send transcript to chat
  if (sendTranscriptBtn) {
    sendTranscriptBtn.addEventListener("click", () => {
      const text = dashTranscriptText.textContent;
      if (text) {
        sessionStorage.setItem("jma-voice-message", text);
        window.location.href = "/";
      }
    });
  }
}

// ── Load voice message from session (redirect from dashboard) ─────────────────
function checkVoiceRedirect() {
  // If on index page with a pending voice message from dashboard
  const pending = sessionStorage.getItem("jma-voice-message");
  if (pending && window.location.pathname === "/") {
    sessionStorage.removeItem("jma-voice-message");
    setTimeout(() => {
      const chatInput = $("chatInput");
      if (chatInput) {
        chatInput.value = pending;
        chatInput.dispatchEvent(new Event("input"));
      }
    }, 800);
  }
}

// ── Update Stat Counters ──────────────────────────────────────────────────────
function initStats() {
  // Simple animation for stats
  const stats = [$("statJobMatches"), $("statCourses"), $("statWelfare"), $("statChats")];
  stats.forEach(el => {
    if (el && el.textContent === "—") {
      el.textContent = "0";
    }
  });

  // Chat count from session
  fetch("/api/profile")
    .then(r => r.json())
    .then(() => {
      // Stats update when user actually runs queries
    })
    .catch(() => {});
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initAccessibility();
  loadProfile();
  initJobMatching();
  initUpskilling();
  initWelfare();
  initVoiceProfile();
  initStats();
  checkVoiceRedirect();
});
