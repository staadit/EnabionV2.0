import type { GetServerSideProps } from 'next';
import { requireOrgContext } from '../../../lib/org-context';

export default function YInboxAlias() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const orgSlug = result.context!.org.slug;
  return {
    redirect: {
      destination: `/${orgSlug}/incoming-intents`,
      permanent: false,
    },
  };
};
