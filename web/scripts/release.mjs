export function releaseHTML(html, version) {
  return html.replace('</head>', `<meta name="tiny-dreams-build" content="${version}"></head>`)
    .replace(/\b(href|src)="(\/(?!\/)[^"?]+\.(?:js|css|png|svg|webmanifest))"/g, `$1="$2?v=${version}"`);
}

export function releaseCSS(css, version) {
  return css.replace(/url\((['"]?)(\/(?!\/)[^)'"\s?]+)\1\)/g, `url($1$2?v=${version}$1)`);
}
