# Hutzell Stitches Embroidery · first draft

## Preview it before connecting any accounts

Extract the entire ZIP. Open `dist/index.html` in a desktop browser. The four pages, catalog filters, design options, and disabled inquiry form work from the included build. Keep the extracted folders together. The footer admin uses server functions and becomes usable on Netlify.

The blush spool mark and product illustrations are draft artwork. The hoop photograph is an AI-generated studio illustration. The pumpkin design and garment choices are based on Rachel’s public September 28 post. The ribbon design is a proposed gift idea. Confirm artwork, sizes, prices and seasonal availability before opening orders.

## 1. Put the source in a private GitHub repository

Use your own account and create an empty **Private** repository on the **main** branch. Use a neutral name such as **studio-preview** if you share a device or account. Upload the extracted project contents using **Add file → Upload files**, then commit. At the top level you should see **netlify.toml**, **package.json**, **public**, **content**, **server**, **scripts**, and **netlify**. Upload the folders themselves, not the ZIP or a single enclosing project folder. The **dist** folder is an offline preview and can be omitted from GitHub. Do not invite Rachel, add her as a collaborator, or use an organization that she can access during the surprise.

## 2. Create the neutral Netlify project

In your own Netlify team, choose **Add new project → Import an existing project → GitHub**. Select the private repository, give the project a neutral name and use these settings.

| Setting | Value |
| --- | --- |
| Production branch | main |
| Base directory | Leave blank |
| Build command | npm run build |
| Publish directory | dist |
| Functions directory | netlify/functions |
| Node version | 22 (in netlify.toml) |

Start the first deployment with **GIFT_PREVIEW_READY unset**. This builds a neutral holding page even if the project URL is accessible. Branch and pull-request builds also return the holding page. No other deploy notification integration is needed.

Open the project’s **Project visibility** or **Password Protection** controls. Set production and previews to **private / team-only** in an account only you can access, or protect **all deploys** with a site-wide password if available. In a logged-out private browser window, verify the Netlify URL requires access. The Admin password protects catalog edits. Storefront privacy is a separate Netlify setting. If your account only offers public hosting, keep the neutral deployment and use the included offline preview until the reveal. Avoid Netlify Drop for this project.

## 3. Give the editor access to this one repository

In GitHub, go to **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**. Pick the repo owner, choose **Only select repositories**, and select this private repository. Under **Repository permissions**, set **Contents** to **Read and write**. Choose an expiry and keep a reminder. Copy the token directly to a private Netlify environment variable. Never commit it to GitHub or paste it into the website. If the production branch requires pull requests, give this integration an approved write path before testing. Direct editor saves create commits on main.

## 4. Add the Netlify settings

The footer **Admin** password for this draft is **embroidery**. The ZIP includes its password hash and the site derives a signing key from the repository token on Netlify. You can skip the password setup script.

Open **Project configuration → Environment variables**. Use the **Production** context and the scopes below if your plan supports them.

| Variable | Value | Scope |
| --- | --- | --- |
| CATALOG_REPO | Your GitHub owner/repository, e.g. your-username/studio-preview | Functions |
| CATALOG_TOKEN | The fine-grained token for this repository | Functions |
| GIFT_PREVIEW_READY | yes, after verifying storefront access | Builds and Functions |

If you entered a different `ADMIN_PASSWORD_HASH` while setting up the first ZIP, remove that variable to use **embroidery**. The catalog branch defaults to `main`.

Leave **ENABLE_FORMSPREE** and **FORMSPREE_FORM_ID** unset. A build with these settings cannot send a customer inquiry. No messages or invitations to Rachel are part of setup.

## 5. Build and check the private draft

In **Deploys**, select **Trigger deploy → Deploy project**. Once the deploy is published, visit the project while signed into your authorized Netlify account. Check the storefront from your phone, and repeat the signed-out access test. Each public page includes a discreet **Admin** link in its footer.

1. Sign in with **embroidery**. Choose **Add item**. Add a title and description, upload an image, enter alt text, and save as **Draft**.
2. Edit the design, change it to **Published**, check **Feature on Home**, and save. The editor reports when the commit has reached the storefront. A foreground tab updates the status for up to four minutes. Netlify’s deploy log is authoritative if a build takes longer.
3. Open the design, choose options, and continue to Contact. Check that the summary matches and **Submissions disabled** is visible. No email test is necessary.
4. Set the temporary design to **Archived**, save, and verify that it disappears. You can restore it by selecting **Published** again. Delete is also available. GitHub history retains prior committed versions.
5. Sign out and check that a fresh visit to Admin asks for the studio password.

## Formspree after the surprise

The intended initial recipient is **zacharyhutz@gmail.com**. No endpoint is configured and the draft sends no messages. When you choose to turn it on, sign into your own [Formspree dashboard](https://formspree.io/forms), create a form, set its target to that address and complete email verification if prompted. Check all notification and automation recipients. Copy the ID from the endpoint **https://formspree.io/f/FORM_ID**.

Set **FORMSPREE_FORM_ID** to the ID alone and **ENABLE_FORMSPREE** to **yes** in Netlify’s production **Builds** environment. Redeploy. Only after enabling it, send a test from the site and confirm receipt in Zach’s inbox. Disable sending again by removing the enable flag and redeploying. An email address alone cannot replace a Formspree endpoint.

## Common deployment issues

| Symptom | What to check |
| --- | --- |
| Only the neutral page appears | Confirm private access first. Set GIFT_PREVIEW_READY=yes for Builds and Functions, then redeploy the production branch. |
| Admin says setup is incomplete | Check CATALOG_REPO and CATALOG_TOKEN in the production Functions environment, then redeploy. |
| Login works but the catalog fails | Confirm the GitHub owner/repo, token expiration, Contents permission and branch. Preserve content/README.md so an empty catalog remains editable. |
| A save conflicts | Reopen the listing to load the latest revision and reapply the edit. |
| An edit is saved but not visible | Check the Netlify production deploy for the matching GitHub commit. Verify status is Published and a photo has alt text. |
| Password needs replacing | Run `node scripts/admin-setup.mjs` to create a new password. Save the printed ADMIN_PASSWORD_HASH and SESSION_SECRET as production Functions variables and redeploy. Changing the signing secret ends previous sessions. |
| Ready to reveal | Confirm Rachel’s approved branding and catalog, then choose when to open visibility and connect a custom domain. For public search indexing, remove the draft robots meta tag in scripts/build.mjs, the Disallow line in its robots output, and the X-Robots-Tag in netlify.toml. Redeploy and verify. |

References: [Netlify repository deployment](https://docs.netlify.com/start/quickstarts/deploy-from-repository/), [deploy privacy controls](https://docs.netlify.com/deploy/protect-deploys/), [function environment variables](https://docs.netlify.com/build/functions/environment-variables/), [fine-grained GitHub tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens), [Formspree target emails](https://help.formspree.io/articles/form-and-project-settings/changing-a-form-email-address).
