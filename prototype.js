// The lo-fi prototype page (prototype.html): click through the wireframes.
// In each wireframe, [data-wf-go] shows a screen, [data-wf-open] opens a bottom sheet
// and [data-wf-close] closes it. The notes beside the wireframe follow along.

for (const frame of document.querySelectorAll("[data-wf-frame]")) {
  const legends = document.querySelector(`[data-wf-legend-for="${frame.id}"]`);
  let current = frame.querySelector("[data-wf-screen]:not([hidden])").dataset.wfScreen;

  const showLegend = (name) => {
    for (const legend of legends.querySelectorAll("[data-wf-legend]")) legend.hidden = legend.dataset.wfLegend !== name;
  };

  function showScreen(name) {
    current = name;
    const screen = frame.querySelector(`[data-wf-screen="${name}"]`);
    for (const s of frame.querySelectorAll("[data-wf-screen]")) s.hidden = s !== screen;
    for (const sheet of frame.querySelectorAll("[data-wf-sheet]")) sheet.hidden = true;
    // The tab or nav item this screen belongs to is marked as current
    const section = screen.dataset.wfSection || name;
    for (const item of frame.querySelectorAll(".wf-nav [data-wf-go], .wf-tabbar [data-wf-go]")) {
      item.setAttribute("aria-current", String(item.dataset.wfGo === section && item.textContent !== "FAQ"));
    }
    const title = frame.querySelector("[data-wf-title]");
    if (title && screen.dataset.wfLabel) title.textContent = screen.dataset.wfLabel;
    frame.querySelector(".wf-tabbar")?.toggleAttribute("hidden", section === "none"); // no tabs on the welcome screen
    (frame.querySelector(".wf-viewport") || frame.querySelector(".wf-phone-screens")).scrollTop = 0;
    showLegend(name);
  }

  frame.addEventListener("click", (event) => {
    const go = event.target.closest("[data-wf-go]");
    const open = event.target.closest("[data-wf-open]");
    const close = event.target.closest("[data-wf-close]");
    if (go) {
      showScreen(go.dataset.wfGo);
      const anchor = go.dataset.wfScroll && frame.querySelector(`[data-wf-anchor="${go.dataset.wfScroll}"]`);
      const viewport = frame.querySelector(".wf-viewport");
      if (anchor && viewport) viewport.scrollTop = anchor.offsetTop - 12; // e.g. FAQ: down to the questions
    }
    if (open) {
      frame.querySelector(`[data-wf-sheet="${open.dataset.wfOpen}"]`).hidden = false;
      showLegend(open.dataset.wfOpen);
    }
    if (close) {
      close.closest("[data-wf-sheet]").hidden = true;
      showLegend(current);
    }
  });

  showScreen(current);
}
