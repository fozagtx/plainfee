# Plainfee task runner. `make help` lists targets.
SHELL := /bin/bash
CONTRACTS := contracts
WEB := web
ENV := set -a; [ -f $(CONTRACTS)/.env ] && source $(CONTRACTS)/.env; set +a;

.PHONY: help install build test test-fork test-all deploy-dry deploy fmt fmt-check web-dev web-build web-check check

help: ## List targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-12s %s\n", $$1, $$2}'

install: ## Pull submodules and web deps
	git submodule update --init --recursive
	cd $(WEB) && pnpm install

build: ## Compile contracts
	cd $(CONTRACTS) && forge build

test: ## Unit and fuzz tests (no network)
	cd $(CONTRACTS) && forge test --no-match-path 'test/fork/*'

test-fork: ## Fork tests against Robinhood Chain mainnet
	$(ENV) cd $(CONTRACTS) && forge test --match-path 'test/fork/*'

test-all: test test-fork ## Everything

deploy-dry: ## Simulate the mainnet deploy (needs SQRT_PRICE_X96)
	$(ENV) cd $(CONTRACTS) && forge script script/Deploy.s.sol --rpc-url robinhood

deploy: ## Deploy to mainnet for real. Spends ETH: owner approval first
	$(ENV) cd $(CONTRACTS) && forge script script/Deploy.s.sol --rpc-url robinhood --account plainfee --broadcast \
		--verify --verifier blockscout --verifier-url https://robinhoodchain.blockscout.com/api/

fmt: ## Format Solidity and TS
	cd $(CONTRACTS) && forge fmt
	cd $(WEB) && pnpm exec prettier --write "src/**/*.{ts,tsx,css}"

fmt-check: ## Fail on unformatted Solidity
	cd $(CONTRACTS) && forge fmt --check

web-dev: ## Next dev server on :3000
	cd $(WEB) && pnpm dev

web-build: ## Production build of the web app
	cd $(WEB) && pnpm build

web-check: ## Lint and typecheck the web app
	cd $(WEB) && pnpm lint && pnpm exec tsc --noEmit

check: build test web-check ## What CI runs
