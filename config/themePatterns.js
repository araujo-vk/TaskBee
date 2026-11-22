// Motivos vetoriais pequenos e repetíveis. As cores são fornecidas pela paleta.
// Nenhum desenho depende de uma imagem externa ou aumenta a largura do layout.
const bee = `<g><ellipse cx="0" cy="0" rx="11" ry="7"/><path d="M-4-6v12M3-6v12M10-2l5-4M10 2l5 4"/><path d="M-6-6c-13-20 13-20 8 0M-6 6c-13 20 13 20 8 0"/></g>`;
const flower = `<g><path d="M0-5c-14-18-24 5-8 8-17 11 3 25 9 9 9 17 27-1 11-10 19-5 3-26-7-9"/><circle r="5"/></g>`;
const leaf = `<g><path d="M-17 14C-23-10 0-19 18-17 20 4 9 23-17 14ZM-16 14 12-12M-7 5l-1-12M2-4l11 1"/></g>`;
const book = `<g><path d="M0-10c-9-6-19-6-25-3v29c8-3 16-2 25 4 9-6 17-7 25-4v-29c-6-3-16-3-25 3v30M-19-6l12 2M-19 1l12 2M8-4l11-2M8 3l11-2"/></g>`;
const hex = `<path d="M-18 0-9-16H9L18 0 9 16H-9Z"/>`;
const star = `<path d="M0-10 3-3 10 0 3 3 0 10-3 3-10 0-3-3Z"/>`;
const flight = `<path stroke-dasharray="2 6" d="M8 176c38-38 75 22 113-7s-32-45-19-15 74 45 113-3"/>`;
const confetti = `<path d="m18 30 6 9m95-24-4 10m55 90 8-4m67 73 6 8m-190-49-6 7"/><circle cx="90" cy="91" r="2"/><circle cx="205" cy="33" r="3"/>`;
const motifs = {
  honeycomb: `<g opacity=".7"><path d="M0 28 16 0h32l16 28-16 28H16ZM64 28 80 0h32l16 28-16 28H80ZM128 28 144 0h32l16 28-16 28h-32ZM32 84 48 56h32l16 28-16 28H48ZM96 84 112 56h32l16 28-16 28h-32ZM160 84 176 56h32l16 28-16 28h-32"/></g><g transform="translate(160 164) rotate(-20)">${bee}</g>`,
  christmas: `<g transform="translate(52 57)"><path d="m0-33-21 28h12L-29 19h58L9-5h12ZM0 19v13"/><circle cx="-7" cy="0" r="2"/><circle cx="8" cy="12" r="2"/></g><g stroke="SECONDARY" transform="translate(180 131)"><circle r="17"/><path d="M-5-16v-7H5v7M-11-7 12 6M-8 6l16 4"/></g><g transform="translate(185 34)">${star}</g>${flight}`,
  tropical: `<g transform="translate(55 52)"><circle r="14"/><path d="M0-23v-7M0 23v7M-23 0h-7M23 0h7M16-16l5-5M-16 16l-5 5M16 16l5 5M-16-16l-5-5"/></g><path stroke="SECONDARY" d="M130 144q16-15 32 0t32 0t32 0M130 157q16-15 32 0t32 0t32 0"/><path d="M160 83q12-32 8-52m0 0q-15-18-30-5m30 5q22-15 33 0m-33 0q-12-5-18 13"/>`,
  carnival: `<g transform="translate(65 67) rotate(-15)"><path d="M-32-14q16-11 32 0 16-11 32 0l-5 26Q13 24 0 9-13 24-27 12ZM-20-3q8-9 14 0-7 8-14 0ZM6-3q8-9 14 0-7 8-14 0Z"/></g><path stroke="SECONDARY" d="M170 45c-30 26 37 23 8 50s40 16 15 46"/><g stroke="TERTIARY">${confetti}</g>`,
  autumn: `<g transform="translate(50 58) rotate(-20)">${leaf}</g><g stroke="SECONDARY" transform="translate(177 132) rotate(50)">${leaf}</g><path stroke-dasharray="3 7" d="M72 96c49-25 48 52 105 40"/>`,
  easter: `<g transform="translate(57 66)"><path d="M0-28c-14 0-33 46-13 53 39 14 36-28 13-53Z"/><path stroke="SECONDARY" d="m-17 2 8-5 8 5 8-5 8 5M-16 15H15"/></g><g stroke="SECONDARY" transform="translate(177 132) scale(.8)">${flower}</g><g transform="translate(168 35) scale(.5)">${flower}</g>`,
  garden: `<g stroke="SECONDARY" transform="translate(50 73)">${flower}<path d="M0 18v28m0-10q17-19 21-9-6 14-21 9"/></g><g transform="translate(177 59) rotate(-20)">${bee}</g>${flight}`,
  june: `<path d="M0 39q120 45 240 0"/><path stroke="SECONDARY" d="m19 46 4 25 12-7 10 12 5-24m32 6 3 24 12-8 11 9 3-23m34-2 5 25 10-11 13 5 0-24m26-7 6 24 11-12 12 3-5-24"/><g stroke="TERTIARY" transform="translate(116 144)"><path d="m0-28 17 25L0 24-17-3ZM-17-3h34M0-28V24m-6 6 6 6 6-6"/></g>`,
  snow: `<g transform="translate(54 63)"><path d="M0-26v52M-23-13l46 26M-23 13l46-26M-6-21l6 6 6-6M-6 21l6-6 6 6M-21-5l8-2-2-8M21 5l-8 2 2 8M-15 15l2-8-8-2M15-15l-2 8 8 2"/></g><g transform="translate(183 141)">${hex}<path d="M-8 0H8M0-8V8"/></g>`,
  forest: `<g transform="translate(60 67) rotate(-25)">${leaf}</g><g stroke="SECONDARY" transform="translate(181 135)"><path d="M-18 10c34 15 39-33 11-28-25 5-3 34 7 15"/></g><path stroke="TERTIARY" d="m150 30 6 8 6-8M24 149l6 8 6-8"/>`,
  spring: `<g stroke="SECONDARY" transform="translate(54 57)">${flower}</g><g stroke="TERTIARY" transform="translate(185 145) scale(.75)">${flower}</g><g transform="translate(164 44) rotate(-25) scale(.8)">${bee}</g>${flight}`,
  halloween: `<g transform="translate(59 72)"><path d="M0-18C-33-33-39 19-13 23h26C39 19 33-33 0-18ZM0-18q-4-15 10-18M-9-6l-6 7h10ZM9-6l-4 7h10ZM-12 10q12 13 24 0"/></g><g stroke="SECONDARY" transform="translate(180 134)"><path d="M-30-10q19-2 23 9l7-7 7 7q4-11 23-9l-9 23q-8-7-14-1L0 19-7 12q-6-6-14 1Z"/></g>`,
  circuits: `<g transform="translate(62 62)">${hex}<path d="M0-7v14M-7 0H7M-18 0h-18v25h-12M18 0h22v-25h16M0 16v30h25"/><circle cx="-50" cy="25" r="3"/><circle cx="59" cy="-25" r="3"/></g><g stroke="SECONDARY" transform="translate(181 153)">${hex}<path d="M-8 0h16"/></g>`,
  fireworks: `<g transform="translate(64 69)"><path d="M0-16v-17M0 16v17M16 0h17M-16 0h-17M12-12l12-12M-12 12l-12 12M12 12l12 12M-12-12l-12-12"/><circle r="4"/></g><g stroke="SECONDARY" transform="translate(181 142)">${star}</g><g stroke="TERTIARY">${confetti}</g>`,
  flight: `<g transform="translate(56 65) rotate(-22)">${bee}</g>${flight}<g stroke="SECONDARY" transform="translate(186 60) scale(.55)">${flower}</g>`,
  mission: `<g transform="translate(58 68)">${hex}<path d="m-8 0 5 5L9-6"/></g><g stroke="SECONDARY" transform="translate(181 142)">${bee}</g>${flight}`,
  library: `<g transform="translate(60 67)">${book}</g><g stroke="SECONDARY" transform="translate(183 137) scale(.65)">${flower}</g><path stroke-dasharray="2 7" d="M100 73q40 42 86 26"/>`,
  feedback: `<g transform="translate(60 67)">${book}</g><g stroke="SECONDARY" transform="translate(179 139)">${star}</g>`,
  conversation: `<g transform="translate(58 65)"><path d="M-27-21h54v34H-5l-17 14 3-14h-8ZM-14-5h28M-14 3H3"/></g><g stroke="SECONDARY" transform="translate(176 137) rotate(-15)">${bee}</g>`,
  hive: `<g transform="translate(62 74)"><path d="M-24 13q-15-12 0-19-8-13 7-18 0-16 17-16t17 16q15 5 7 18 15 7 0 19ZM-24-6h48M-17-24h34M-24 13h48M-7 13V2a7 7 0 0 1 14 0v11"/></g><g stroke="SECONDARY" transform="translate(181 139)">${bee}</g>`,
  guardian: `<g transform="translate(60 64)"><path d="m0-28 24 9v23Q22 20 0 32-22 20-24 4v-23Z"/><g transform="scale(.8)">${hex}</g></g><g stroke="SECONDARY" transform="translate(181 143)">${bee}</g>`,
  crown: `<g transform="translate(60 65)"><path d="m-26-12 12 12L0-24 14 0l12-12-6 33h-40ZM-20 13h40"/></g><g stroke="SECONDARY" transform="translate(181 139)">${hex}</g><g stroke="TERTIARY" transform="translate(181 45)">${star}</g>`,
  lucky: `<g transform="translate(58 69)"><circle r="27"/><circle r="20" stroke-dasharray="3 4"/><path d="M-8-11H9L-3 13"/></g><g stroke="SECONDARY" transform="translate(180 139)"><path d="m0-23 16 23L0 23-16 0Z"/></g><g stroke="TERTIARY" transform="translate(183 42)">${star}</g>`,
  teapot: `<g transform="translate(63 79)"><path d="M-18-12h36l5 26q-23 19-46 0ZM-18-12l-17-8 13 30M20-8q27-9 23 9-3 13-20 12M-20-17h40M-3-17v-6h6v6M-7-30c-12-14 10-11 0-25M7-30c-12-14 10-11 0-25"/></g><g stroke="SECONDARY" transform="translate(180 144) rotate(-20)">${bee}</g>`
};
function background(pattern, colors) {
  const motif=motifs[pattern];
  if(!motif) throw new Error(`Padrão desconhecido: ${pattern}`);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="210" viewBox="0 0 240 210"><g fill="none" stroke="${colors.primary}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${motif.replaceAll('SECONDARY',colors.secondary).replaceAll('TERTIARY',colors.tertiary)}</g></svg>`;
  const encoded=encodeURIComponent(svg).replace(/[!'()*]/g,char=>`%${char.charCodeAt(0).toString(16)}`);
  return `url(data:image/svg+xml,${encoded})`;
}
module.exports={background,motifs};
