import path, { resolve } from "path";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig(({ mode }) => {
    const isDev = mode === "development";

    return {
        plugins: [
            viteStaticCopy({
                targets: [
                    { src: "module.json", dest: "" },
                    { src: "assets", dest: "" },
                    { src: "styles", dest: "" },
                    { src: "templates", dest: "" },
                    { src: "CHANGELOG.md", dest: "" },
                    { src: "LICENSE.txt", dest: "" },
                    { src: "README.md", dest: "" },
                    { src: "THIRD_PARTY_NOTICES.md", dest: "" },
                ],
            }),
        ],

        base: isDev ? `/modules/tobbys-turn-planner/` : "./",

        server: isDev
            ? {
                  port: 30001,
                  proxy: {
                      [`^/(?!modules/tobbys-turn-planner)`]: "http://localhost:30000",
                      "/socket.io": {
                          target: "ws://localhost:30000",
                          ws: true,
                      },
                  },
              }
            : undefined,

        publicDir: false,

        build: {
            outDir: path.resolve(__dirname, "tobbys-turn-planner"),
            emptyOutDir: true,
            rollupOptions: {
                input: {
                    main: resolve(__dirname, "src/main.ts"),
                },
                output: {
                    entryFileNames: "[name].bundle.js",
                    chunkFileNames: "assets/[name].js",
                    assetFileNames: "assets/[name].[ext]",
                },
            },
        },

        resolve: {
            alias: {
                "@": path.resolve(__dirname, "src"),
            },
        },
    };
});
