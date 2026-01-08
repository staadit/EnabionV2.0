import type { GetServerSideProps } from 'next';
import { getOwnerContext } from '../../../lib/admin-server';

export default function SettingsIndex() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const result = await getOwnerContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  return {
    redirect: {
      destination: `/${result.context!.org.slug}/settings/org`,
      permanent: false,
    },
  };
};
