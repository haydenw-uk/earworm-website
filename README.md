# Earworm: Dissertation Showcase

Interactive one-page site for **Earworm: Evaluating Large Audio Language Model Agents for Susceptibility to Audio Prompt Injection Attacks**, a BSc dissertation by Hayden Williams at Oxford Brookes University. The dissertation received A+ / 76% and was shortlisted for TechShow 2026.

## Research Framework Context

The repository behind the research contains a FastAPI agent service with a custom ReAct loop, a Streamlit UI, an automated runner, and a vLLM model server, all orchestrated with Docker Compose and NVIDIA GPU support. The tested LALMs are Gemma-4-e4b-it, Ultravox v0.5-8b, and Voxtral Mini-3B. The framework uses separate PostgreSQL databases for customer data and experiment results, LangChain/LangGraph for tool calling, and pydub/FFmpeg for audio processing.

## Structure
```
index.html
assets/
  css/   fonts.css, styles.css
  js/    main.js (module), three.module.min.js, gsap.min.js, ScrollTrigger.min.js
  fonts/ Space Grotesk, Inter, JetBrains Mono (woff2)
.nojekyll
```

## Notes
- Fully responsive; respects `prefers-reduced-motion`; keyboard focus visible.
- The hero WebGL field and canvas demos degrade gracefully if WebGL/JS is unavailable.
