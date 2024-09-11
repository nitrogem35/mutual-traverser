# mutual-traverser
CLI-based script to check a given discord server for mutual servers  
![demo pic](/demo.jpg)

Run `node index.js` to get started.

# usage
You will first need to scrape a list of users from your target server.  
Use the `scrape` command to acquire a JSON file containing such a list for further processing.  
Then, use the `mutuals` command to select this JSON file and specify which mutual servers you are looking for.

Planned features:
- [x] Scrape most of the member list beyond just the online members
- [x] Save scraped data in a convenient format for parsing by the program and external tools  
- [x] Read the scraped member list and look for mutual servers among the members
- [ ] Add another cmd to also check for mutual friends
