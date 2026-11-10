(function () {
  function escHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function formatGigDate(iso, time) {
    try {
      const d = new Date(iso + "T12:00:00");
      const out = d.toLocaleDateString("en-GB", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return time ? out + " · " + time : out;
    } catch {
      return iso;
    }
  }

  function gigCard(g) {
    const ticket = g.ticketUrl
      ? `<p style="margin-top:10px;"><a class="buy-btn live" style="display:inline-block;text-decoration:none;" href="${escHtml(g.ticketUrl)}" target="_blank" rel="noopener">Listing / tickets</a></p>`
      : "";
    const addr = g.address ? `<div class="venue">${escHtml(g.address)}</div>` : "";
    const notes = g.notes
      ? `<div style="margin-top:4px;color:#9a9388;font-size:0.85rem;">${escHtml(g.notes)}</div>`
      : "";
    return `<article class="gig-card">
      <div class="when">${escHtml(formatGigDate(g.date, g.time))}</div>
      <h3>${escHtml(g.title || g.venue)}</h3>
      <div class="venue"><strong>${escHtml(g.venue)}</strong> · ${escHtml(g.city)}${g.country ? ", " + escHtml(g.country) : ""}</div>
      ${addr}${notes}
      <div class="source">Source: ${
        g.sourceUrl
          ? `<a href="${escHtml(g.sourceUrl)}" target="_blank" rel="noopener">${escHtml(g.source || "listing")}</a>`
          : escHtml(g.source || "listing")
      }</div>
      ${ticket}
    </article>`;
  }

  async function loadGigs() {
    const upcomingEl = document.getElementById("gigsUpcoming");
    const pastEl = document.getElementById("gigsPast");
    if (!upcomingEl || !pastEl) return;
    try {
      const res = await fetch("data/gigs.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("gigs " + res.status);
      const data = await res.json();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const gigs = (data.gigs || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
      const upcoming = gigs.filter((g) => new Date(g.date + "T23:59:59") >= today);
      const past = gigs.filter((g) => new Date(g.date + "T23:59:59") < today).reverse();

      if (!upcoming.length) {
        const f = data.follow || {};
        upcomingEl.innerHTML = `
          <div class="gigs-section-title">Upcoming</div>
          <div class="gigs-empty">
            <strong>No upcoming shows right now</strong>
            Follow Eugene Fight Club for the next Budapest date — we’ll post it here as soon as it’s listed.
            <div class="follow-links">
              ${f.ampwall ? `<a href="${escHtml(f.ampwall)}" target="_blank" rel="noopener">Ampwall</a>` : ""}
              ${f.facebook ? `<a href="${escHtml(f.facebook)}" target="_blank" rel="noopener">Facebook</a>` : ""}
              ${f.site ? `<a href="${escHtml(f.site)}" target="_blank" rel="noopener">eugenefightclub.com</a>` : ""}
            </div>
          </div>`;
      } else {
        upcomingEl.innerHTML =
          `<div class="gigs-section-title">Upcoming</div>` + upcoming.map(gigCard).join("");
      }

      pastEl.innerHTML = past.length
        ? `<div class="gigs-section-title">Past shows</div>` + past.map(gigCard).join("")
        : "";
    } catch (err) {
      console.error(err);
      upcomingEl.innerHTML = `<div class="gigs-empty"><strong>Couldn’t load gigs</strong> Try refresh. (${escHtml(err.message)})</div>`;
    }
  }

  let merchConfig = null;

  function merchCard(p) {
    const sizes = (p.sizes || [])
      .map((s) => `<option value="${escHtml(s)}">${escHtml(s)}</option>`)
      .join("");
    const live = !!(p.productUrl && String(p.productUrl).trim());
    const btn = live
      ? `<a class="buy-btn live" style="text-align:center;text-decoration:none;display:block;" href="${escHtml(p.productUrl)}" target="_blank" rel="noopener">Buy</a>`
      : `<button type="button" class="buy-btn soon" data-notify="${escHtml(p.id)}">Coming soon · Notify me</button>`;
    const price = typeof p.price === "number" ? p.price.toFixed(2) : p.price;
    return `<article class="merch-card" data-id="${escHtml(p.id)}">
      <img src="${escHtml(p.image)}" alt="${escHtml(p.name)}" loading="lazy">
      <div class="body">
        <h3>${escHtml(p.name)}</h3>
        <div class="meta">${escHtml(p.type)} · ${(p.colors || []).map(escHtml).join(" / ")}</div>
        <div class="price">$${price}</div>
        <p class="meta">${escHtml(p.description || "")}</p>
        <label class="meta">Size
          <select aria-label="Size for ${escHtml(p.name)}">${sizes}</select>
        </label>
        ${btn}
      </div>
    </article>`;
  }

  function notifyMerch(productId) {
    const email = (merchConfig && merchConfig.notifyEmail) || "";
    if (email) {
      const subject = encodeURIComponent("EFC merch notify: " + productId);
      window.location.href =
        "mailto:" +
        email +
        "?subject=" +
        subject +
        "&body=" +
        encodeURIComponent("Please notify me when this merch drops.");
      return;
    }
    alert(
      "Merch is print-on-demand and almost ready.\n\nKeith is wiring a Fourthwall shop. Follow Ampwall / Facebook for the drop — Buy links will light up here automatically."
    );
  }

  async function loadMerch() {
    const grid = document.getElementById("merchGrid");
    const bar = document.getElementById("merchStoreBar");
    if (!grid) return;
    try {
      const res = await fetch("data/merch.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("merch " + res.status);
      merchConfig = await res.json();
      if (merchConfig.storeUrl && bar) {
        bar.style.display = "block";
        bar.innerHTML =
          'Store open: <a href="' +
          escHtml(merchConfig.storeUrl) +
          '" target="_blank" rel="noopener">' +
          escHtml(merchConfig.storeUrl) +
          "</a>";
      }
      grid.innerHTML = (merchConfig.products || []).map(merchCard).join("") || "<p>No products configured.</p>";
      grid.querySelectorAll("[data-notify]").forEach((btn) => {
        btn.addEventListener("click", () => notifyMerch(btn.getAttribute("data-notify")));
      });
    } catch (err) {
      console.error(err);
      grid.innerHTML = `<p>Couldn’t load merch (${escHtml(err.message)}).</p>`;
    }
  }

  function boot() {
    loadGigs();
    loadMerch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.notifyMerch = notifyMerch;
})();
