I guess we have a broken flow. Real flow: clone the trunk/main -> cacning,
  indexing -> Create based in main PR branch -> orchestrator initiates agents by
  specific roles (security, perfromance, architecture, dependency and code
  quality) based on repo language and size  -> initiated tools execution for each
  agent -> results analyzed by role agent for each branch and returned to
  orchestrator -> here flow splitted on 2: -> sent request to Educator agent to
  search for each unique issue related training material and another to
  orchestrator comparator to compare 2 branches report and identify 2 categories
  of issues "4-category classification" and both return back to orchestrator
  which generates final report 