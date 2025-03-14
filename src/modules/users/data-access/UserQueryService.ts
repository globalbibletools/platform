import { query } from "@/db";
import { SearchUserOptions, SearchUserPageView, SimpleUserView } from "./types";

const userQueryService = {
  async findByEmail(email: string): Promise<SimpleUserView | undefined> {
    const result = await query<SimpleUserView>(
      `
        select id, name, email from users where email = $1
      `,
      [email.toLowerCase()],
    );

    return result.rows[0];
  },

  async findById(id: string): Promise<SimpleUserView | undefined> {
    const result = await query<SimpleUserView>(
      `
        select id, name, email from users where id = $1
      `,
      [id],
    );

    return result.rows[0];
  },

  async search(options: SearchUserOptions): Promise<SearchUserPageView> {
    const usersQuery = await query<SearchUserPageView>(
      `
        select
            (
                select count(*) from users u
                where u.status <> 'disabled'
            ) as total,
            (
                select
                    coalesce(json_agg(u.json), '[]')
                from (
                    select
                        json_build_object(
                            'id', id, 
                            'name', name,
                            'email', email,
                            'emailStatus', email_status,
                            'roles', roles.list,
                            'invite', invitation.json
                        ) as json
                    from users as u
                    join lateral (
                        select
                            coalesce(json_agg(r.role), '[]') as list
                        from user_system_role as r
                        where r.user_id = u.id
                    ) as roles on true
                    left join lateral (
                        select
                            json_build_object(
                              'token', i.token,
                              'expires', i.expires
                            ) as json
                        from user_invitation as i
                        where i.user_id = u.id
                        order by i.expires desc
                        limit 1
                    ) as invitation on true
                    where u.status <> 'disabled'
                    order by u.name
                    offset $1
                    limit $2
                ) as u
            ) as page
      `,
      [options.page * options.limit, options.limit],
    );
    return usersQuery.rows[0];
  },
};
export default userQueryService;
