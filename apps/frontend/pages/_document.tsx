import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';
import { buildPaletteStyle, resolvePalette } from '../lib/palette';

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
    var theme = (preferred === 'light' || preferred === 'dark') ? preferred : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
`;

type PaletteDocumentProps = {
  paletteCss: string;
  paletteSlug?: string;
};

class MyDocument extends Document<PaletteDocumentProps> {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    const { tokens, slug } = await resolvePalette(ctx.req);
    const paletteCss = buildPaletteStyle(tokens);
    return { ...initialProps, paletteCss, paletteSlug: slug };
  }

  render() {
    const { paletteCss, paletteSlug } = this.props;
    return (
      <Html data-theme="light" data-palette={paletteSlug ?? 'default'}>
        <Head>
          <style id="enabion-palette-vars" dangerouslySetInnerHTML={{ __html: paletteCss }} />
        </Head>
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
