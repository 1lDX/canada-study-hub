<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Admin role scope
The `admin` role is account-management only: it must never get read or write access to application contents (applications, application_documents, offers, invoices, payments). Do not add RLS policies or grants that give admin access to those tables; admin server functions verify the caller with `has_role(..., 'admin')` and read account data through the service-role client after that check. Why: the role was requested as minimal, deliberately separated from case data.
