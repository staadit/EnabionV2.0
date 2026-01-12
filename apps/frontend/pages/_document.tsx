import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';

const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('enabion_theme');
    var fromCookie = (document.cookie || '').split(';').map(function(x){return x.trim();}).find(function(c){return c.indexOf('enabion_theme=')===0;});
    var cookieVal = fromCookie ? fromCookie.split('=')[1] : null;
    var preferred = stored || cookieVal;
    if (preferred === 'system' || !preferred) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      preferred = mq.matches ? 'dark' : 'light';
    }
    var theme = (preferred === 'light' || preferred === 'dark') ? preferred : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html data-theme="dark">
        <Head />
        <body>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
