import type { GetServerSideProps } from 'next';
import { requireOrgContext } from '../../../lib/org-context';

export default function YInboxDetailAlias() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const result = await requireOrgContext(ctx);
  if (result.redirect) {
    return { redirect: result.redirect };
  }
  const orgSlug = result.context!.org.slug;
  const intentId =
    typeof ctx.params?.intentId === 'string' ? ctx.params.intentId : 'intent';
  return {
    redirect: {
      destination: `/${orgSlug}/incoming-intents/${intentId}`,
      permanent: false,
    },
  };
};
