import type { AppProps } from 'next/app';
import '../styles/theme.css';

export default function EnabionApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
