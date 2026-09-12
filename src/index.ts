#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { initProject, findProjectRoot, readProjectConfig } from "./storage/project.js";

const program = new Command();

program
  .name("agentmesh")
  .description("Provider-agnostic multi-agent orchestration for the terminal")
  .version("0.1.0");

program
  .command("init [name]")
  .description("Create an AgentMesh project in the current directory or a new folder")
  .action((name?: string) => {
    const root = initProject(name);
    console.log(chalk.green("✓ AgentMesh project created"));
    console.log(chalk.cyan("  " + root));
    console.log("\nNext steps:");
    console.log("  agentmesh status");
    console.log("  agentmesh agents");
  });

program
  .command("status")
  .description("Show the current AgentMesh project status")
  .action(() => {
    const root = findProjectRoot(process.cwd());
    if (!root) {
      console.log(chalk.yellow("No AgentMesh project found. Run: agentmesh init"));
      process.exitCode = 1;
      return;
    }
    const config = readProjectConfig(root);
    console.log(chalk.bold(config.name));
    console.log("Project:", root);
    console.log("Version:", config.version);
    console.log("Active agent:", config.activeAgent ?? "none");
  });

program
  .command("agents")
  .description("List agents connected to this project")
  .action(() => {
    const root = findProjectRoot(process.cwd());
    if (!root) {
      console.log(chalk.yellow("No AgentMesh project found. Run: agentmesh init"));
      process.exitCode = 1;
      return;
    }
    const config = readProjectConfig(root);
    if (config.agents.length === 0) {
      console.log(chalk.cyan("No agents connected yet."));
      console.log("Connectors are the next implementation phase.");
      return;
    }
    for (const agent of config.agents) {
      console.log(`• ${agent.name} (${agent.provider})`);
    }
  });

program.parse();
