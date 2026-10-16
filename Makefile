.DEFAULT_GOAL := help

.PHONY: help install dev build preview test test-watch typecheck clean deploy

help: ## Show the available commands
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

dev: ## Start the dev server at http://localhost:5173
	npm run dev

build: ## Type-check and build the production bundle
	npm run build

preview: build ## Build and preview the production bundle locally
	npm run preview

test: ## Run the unit tests once
	npm run test

test-watch: ## Run the unit tests in watch mode
	npm run test:watch

typecheck: ## Type-check without building
	npx tsc -b

clean: ## Remove build output and installed dependencies
	rm -rf dist node_modules

deploy: ## Deploy to Vercel (production)
	npx vercel --prod
