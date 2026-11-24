import test from "node:test";
import assert from "node:assert/strict";
import { isBlockedIp } from "../lib/ipGuard.ts";
import { extractSiteText } from "../lib/siteText.ts";

test("private and local addresses are blocked, public ones are not", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.5", "172.16.0.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "not-an-ip"]) {
    assert.equal(isBlockedIp(ip), true, ip);
  }
  for (const ip of ["8.8.8.8", "93.184.216.34", "172.32.0.1", "2606:4700:4700::1111"]) {
    assert.equal(isBlockedIp(ip), false, ip);
  }
});

test("extractSiteText reads title, description, headings and body, and skips scripts", () => {
  const html = `<html><head><title>Brightloop &amp; Co</title>
    <meta property="og:site_name" content="Brightloop">
    <meta content="Plan habits in minutes." name="description">
    <style>.x{color:red}</style><script>var secret = 1;</script></head>
    <body><h1>Build habits that stick</h1><p>Free on <b>iPhone</b> and Android.</p>
    <h2>How it works</h2><ul><li>Pick a goal</li><li>Get a weekly plan</li></ul></body></html>`;
  const s = extractSiteText(html);
  assert.equal(s.title, "Brightloop & Co");
  assert.equal(s.siteName, "Brightloop");
  assert.equal(s.description, "Plan habits in minutes.");
  assert.deepEqual(s.headings, ["Build habits that stick", "How it works"]);
  assert.ok(s.text.includes("Free on iPhone and Android."));
  assert.ok(!s.text.includes("secret") && !s.text.includes("color:red"));
});

test("extractSiteText falls back to structured data when the page body is empty", () => {
  const html = `<html><head><title>Acme</title><meta property="og:description" content="Plan your week"><script type="application/ld+json">{"@type":"SoftwareApplication","name":"Acme Planner","description":"Acme turns your goals into a weekly plan."}</script></head><body><div id="root"></div></body></html>`;
  const s = extractSiteText(html);
  assert.equal(s.description, "Plan your week");
  assert.match(s.text, /Acme turns your goals into a weekly plan/);
});
