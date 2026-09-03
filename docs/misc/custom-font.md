### Custom Font Setup

If you want to use any Google Font for your distance labels, follow these steps:

1.  **Browse Google Fonts**
    Open [Google Fonts](https://fonts.google.com/) and locate the font you’d like (e.g. _Dancing Script_).

2.  **Get the embed code**

    -   Click **Get Font**.
    -   Click **Get embed code**.
    -   Select the **Web** tab.
    -   Switch to the **@import** sub-tab.
    -   You’ll see something like:
        ```html
        <style>
            @import url("https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&display=swap");
        </style>
        ```

3.  **Copy the @import**
    Copy only the `@import` line (including the semicolon), for example:
    ```css
    @import url("https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&display=swap");
    ```
4.  **Paste into your module settings**

    -   Go to Module Settings → Tobby's Turn Planner → CSS @import for your font.
    -   Replace the default import with the line you copied above.

5.  **Set the font-family name**

    -   In Module Settings → Tobby's Turn Planner → Font-Family name, enter the exact font name as shown on Google Fonts (e.g. Dancing Script).

Foundry will then fetch the new font and rebake it for you.
If the font fails to load, you’ll see a warning and it will fall back to either the default (Cal Sans) or your system default.
