export type OrgMemberOption = {
  id: string;
  email: string;
  role: string;
};

const BACKEND_BASE = process.env.BACKEND_URL || 'http://backend:4000';

export async function fetchOrgMembers(cookie: string): Promise<OrgMemberOption[]> {
  try {
    const res = await fetch(`${BACKEND_BASE}/v1/org/members/lookup`, {
      headers: { cookie },
    });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    const members = Array.isArray(data?.members) ? data.members : data;
    if (!Array.isArray(members)) {
      return [];
    }
    return members.map((member) => ({
      id: String(member.id ?? ''),
      email: String(member.email ?? ''),
      role: String(member.role ?? ''),
    }));
  } catch {
    return [];
  }
}
