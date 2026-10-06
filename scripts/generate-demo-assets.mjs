import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('demo/public/images', { recursive: true });
const rect = (x, y, w, h, fill, radius = 8, stroke = 'none') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
const text = (x, y, value, size = 13, fill = '#6c7865', weight = 400) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" font-weight="${weight}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">${value}</text>`;
const svg = (w, h, content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${content}</svg>`;

function overview(dark = false) {
  const bg = dark ? '#1b211c' : '#fafbf7';
  const surface = dark ? '#242d25' : '#ffffff';
  const border = dark ? '#364236' : '#e5ebdf';
  const ink = dark ? '#dce7d6' : '#344a2b';
  const muted = dark ? '#93a38a' : '#839777';
  let s = rect(0, 0, 1120, 720, bg, 0);
  s += rect(0, 0, 214, 720, dark ? '#202820' : '#f0f4e9', 0);
  s +=
    rect(22, 26, 30, 30, '#698660', 9) +
    text(30, 47, 'n', 19, '#fff', 600) +
    text(62, 48, 'northstar', 17, ink, 550);
  s += text(24, 108, 'WORKSPACE', 10, muted, 550);
  s +=
    rect(12, 126, 188, 38, dark ? '#344431' : '#e0ebd5', 8) +
    text(29, 150, '◈   Overview', 13, ink, 550);
  for (const [i, label] of ['Projects', 'Activity', 'Team', 'Settings'].entries())
    s += text(29, 194 + i * 43, label, 13, muted);
  s += text(24, 455, 'YOUR PROJECTS', 10, muted, 550);
  for (const [i, label] of ['Workspace refresh', 'Design foundations', 'Autumn release'].entries())
    s +=
      rect(27, 480 + i * 38, 7, 7, ['#9eb88a', '#b8a5c8', '#d6b98d'][i], 2) +
      text(43, 488 + i * 38, label, 11, muted);
  s += text(25, 683, 'Maya Chen', 12, ink, 550) + text(155, 683, '⌘ K', 11, muted);
  s += text(258, 45, 'Workspace / Overview', 11, muted) + text(992, 45, 'MC', 11, muted);
  s +=
    text(258, 123, 'Room for good work.', 30, ink, 550) +
    text(258, 153, 'A clear view of what’s moving, and what’s next.', 13, muted);
  s +=
    rect(953, 94, 125, 34, dark ? '#8fac7f' : '#6d8b5e', 8) +
    text(970, 116, '+ New project', 11, dark ? '#172314' : '#fff', 550);
  for (const [i, stat] of [
    ['Active projects', '12', '+2 this month'],
    ['Tasks completed', '84', 'Across your workspace'],
    ['Team momentum', '92%', 'Looking good'],
  ].entries()) {
    const x = 258 + i * 280;
    s +=
      rect(x, 192, 260, 130, surface, 11, border) +
      text(x + 21, 225, stat[0], 11, muted) +
      text(x + 21, 267, stat[1], 29, ink, 550) +
      text(x + 21, 295, stat[2], 10, muted);
  }
  s += text(258, 367, 'Your projects', 16, ink, 550) + text(999, 367, 'View all →', 11, muted);
  for (const [i, title] of [
    'Workspace refresh',
    'Design foundations',
    'Autumn release',
  ].entries()) {
    const x = 258 + i * 280;
    s +=
      rect(x, 391, 260, 195, surface, 11, border) +
      rect(x + 20, 413, 31, 31, dark ? '#354532' : '#edf3e5', 9) +
      text(x + 30, 434, ['◇', '◉', '↗'][i], 15, muted);
    s +=
      text(x + 20, 475, title, 14, ink, 550) +
      text(
        x + 20,
        499,
        [
          'Making space for focus.',
          'A shared language for better work.',
          'The next chapter, together.',
        ][i],
        10,
        muted,
      );
    s +=
      rect(x + 20, 522, 219, 4, border, 2) + rect(x + 20, 522, [154, 92, 185][i], 4, '#96b184', 2);
    s +=
      text(x + 20, 559, ['18 of 24 tasks', '8 of 20 tasks', '22 of 26 tasks'][i], 10, muted) +
      text(x + 198, 559, ['75%', '40%', '85%'][i], 10, ink);
  }
  s +=
    rect(258, 613, 820, 63, dark ? '#2d382a' : '#eef4e7', 9) +
    text(280, 640, 'A little progress, every day.', 12, ink, 550) +
    text(280, 660, 'Your team completed 14 tasks this week. Keep the good work going.', 10, muted) +
    text(979, 651, 'Activity →', 10, muted);
  return svg(1120, 720, s);
}

function settings() {
  let s =
    rect(0, 0, 920, 650, '#fafbf7', 0) +
    text(48, 52, 'northstar / Settings', 12) +
    text(48, 114, 'On your terms.', 29, '#344a2b', 550) +
    text(48, 145, 'Choose what reaches you, and when.', 13);
  s += rect(48, 188, 200, 37, '#e7efdf', 8) + text(65, 211, 'Notifications', 12, '#536b46', 550);
  for (const [i, label] of ['Profile', 'Appearance', 'Workspace', 'Security'].entries())
    s += text(65, 270 + i * 42, label, 12);
  s +=
    rect(284, 188, 587, 364, '#fff', 12, '#e5ebdf') +
    text(309, 224, 'Stay in the loop', 17, '#344a2b', 550);
  for (const [i, row] of [
    ['Project updates', 'Changes to the projects you follow.'],
    ['Mentions and replies', 'When someone needs your attention.'],
    ['Weekly digest', 'A quiet summary, once a week.'],
    ['Product announcements', 'Occasional news from the team.'],
  ].entries()) {
    s += text(310, 277 + i * 70, row[0], 13, '#4d6243', 550) + text(310, 298 + i * 70, row[1], 11);
    s +=
      rect(799, 259 + i * 70, 43, 24, i < 3 ? '#8ca67c' : '#dce3d6', 12) +
      rect(i < 3 ? 820 : 802, 262 + i * 70, 18, 18, '#fff', 9);
  }
  s += rect(750, 580, 121, 34, '#6d8b5e', 8) + text(772, 602, 'Save changes', 11, '#fff', 550);
  return svg(920, 650, s);
}

function detail() {
  let s =
    rect(0, 0, 1000, 650, '#fafbf7', 0) +
    text(45, 45, 'Projects / Workspace refresh', 12) +
    text(45, 108, 'The details make the difference.', 27, '#344a2b', 550) +
    text(45, 140, 'Release activity · October 2026', 12);
  s +=
    rect(45, 182, 610, 411, '#fff', 12, '#e5ebdf') +
    text(70, 217, 'Recent activity', 15, '#344a2b', 550);
  for (const [i, row] of [
    ['Maya updated the workspace overview', 'Today, 10:24 AM'],
    ['Alex reviewed notification preferences', 'Yesterday, 3:12 PM'],
    ['Jo completed keyboard navigation', 'Yesterday, 11:05 AM'],
    ['Sam opened the release checklist', 'Monday, 9:40 AM'],
  ].entries()) {
    s +=
      rect(71, 249 + i * 82, 30, 30, ['#e4deef', '#dce7ed', '#ecdfd3', '#dce8d9'][i], 15) +
      text(82, 269 + i * 82, ['M', 'A', 'J', 'S'][i], 10) +
      text(118, 265 + i * 82, row[0], 12, '#53684a', 550) +
      text(118, 287 + i * 82, row[1], 10);
  }
  s +=
    rect(685, 182, 270, 210, '#edf3e6', 12) +
    text(710, 217, 'Ready for a closer look', 15, '#344a2b', 550) +
    text(710, 251, 'All checks passed', 12) +
    text(710, 282, '2 approvals', 12) +
    text(710, 313, '8 files updated', 12) +
    rect(710, 339, 219, 4, '#d6e3c9', 2) +
    rect(710, 339, 219, 4, '#91ab7f', 2);
  return svg(1000, 650, s);
}

writeFileSync('demo/public/images/overview.svg', overview());
writeFileSync('demo/public/images/dark.svg', overview(true));
writeFileSync('demo/public/images/settings.svg', settings());
writeFileSync('demo/public/images/detail.svg', detail());
writeFileSync(
  'demo/public/images/tall.svg',
  svg(
    200,
    4000,
    rect(0, 0, 200, 4000, '#f5f7ef', 0) +
      Array.from(
        { length: 24 },
        (_, i) =>
          rect(12, 24 + i * 162, 176, 138, '#fff', 8, '#dce5d2') +
          text(23, 51 + i * 162, `Checkout step ${i + 1}`, 12, '#536b46', 550),
      ).join(''),
  ),
);
writeFileSync(
  'demo/public/images/wide.svg',
  svg(
    4000,
    200,
    rect(0, 0, 4000, 200, '#f5f7ef', 0) +
      Array.from(
        { length: 16 },
        (_, i) =>
          rect(18 + i * 248, 30, 222, 138, '#fff', 8, '#dce5d2') +
          text(35 + i * 248, 65, `Release milestone ${i + 1}`, 13, '#536b46', 550),
      ).join(''),
  ),
);
writeFileSync(
  'demo/public/images/transparent.svg',
  svg(
    600,
    400,
    rect(155, 80, 235, 160, 'none', 20, '#719064') +
      rect(185, 110, 235, 160, 'none', 20, '#91ac82') +
      text(207, 204, 'PR Lens', 28, '#719064', 550),
  ),
);
