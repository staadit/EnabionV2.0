import type { GetServerSideProps } from 'next';
import { getOwnerContext } from '../../lib/admin-server';

export default function SettingsIndex() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const result = await getOwnerContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const orgSlug = result.context!.org.slug;
  return {
    redirect: {
      destination: `/${orgSlug}/settings/org`,
      permanent: false,
    },
  };
};
