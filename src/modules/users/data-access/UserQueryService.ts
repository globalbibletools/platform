import { query } from "@/db";
import {
  InviteView,
  SearchUsersOptions,
  SearchUsersView,
  SimpleUserView,
  UserProfileView,
} from "./types";

const userQueryService = {
  async resetPasswordTokenExists(token: string): Promise<boolean> {
    const result = await query(
      `
        select 1 from reset_password_token
        where token = $1
            and expires > (extract(epohc from current_timestamp)::bigint * 1000::bigint)
      `,
      [token],
    );
    return result.rows.length > 0;
  },

  async findInviteByToken(token: string): Promise<InviteView> {
    const result = await query<InviteView>(
      `
        select u.email, i.token
        from user_invitation as i
        join users as u on u.id = i.user_id
        where i.token = $1
      `,
      [token],
    );
    return result.rows[0];
  },

  async findByEmail(email: string): Promise<SimpleUserView> {
    const result = await query<SimpleUserView>(
      `
        select id from users where email = $1
      `,
      [email.toLowerCase()],
    );
    return result.rows[0];
  },

  async findProfileById(id: string): Promise<UserProfileView> {
    const result = await query<UserProfileView>(
      `
        select id, name, email
        from users
        where id = $1
      `,
      [id],
    );
    return result.rows[0];
  },

  async searchUsers({
    page,
    limit,
  }: SearchUsersOptions): Promise<SearchUsersView> {
    const result = await query<SearchUsersView>(
      `
        select
          (
            select count(*)
            from users u
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
          ) AS page
        `,
      [page * limit, limit],
    );
    return result.rows[0];
  },
};
export default userQueryService;
