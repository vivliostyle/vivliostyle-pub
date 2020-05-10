const VIVLIOSTYLE_VIEWER_HTML_URL =
  process.env.VIVLIOSTYLE_VIEWER_HTML_URL ||
  'http://localhost:9990/viewer/index.html';

export function Viewer() {
  return <iframe src={VIVLIOSTYLE_VIEWER_HTML_URL} width="1000"></iframe>;
}
