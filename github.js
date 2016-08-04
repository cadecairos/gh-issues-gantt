const GitHubAPI = require('github-api');
const gh = new GitHubAPI({
   token: process.env.GITHUB_OAUTH_TOKEN
});


class GitHub {
   constructor() {
      this.cache = {
         status: 'stale',
         issues: [],
         milestones: []
      };
   }

   refreshData(cb) {
      let issues = gh.getIssues(process.env.GITHUB_USER, process.env.GITHUB_REPO);
      issues.listIssues({
         status: 'open'
      }).then((issues) => {
         this.cache.issues = issues.data
         
         let milestones = gh.getIssues(process.env.GITHUB_USER, process.env.GITHUB_REPO);
         
         return milestones.listMilestones({
            status: 'open'
         });
      }).then((milestones) => {
         this.cache.milestones = milestones.data;
         this.cache.status = 'fresh';

         cb(null, this.cache);
      });
   }

   fetchData(cb) {
      if (this.cache.status === 'stale') {
         this.cache.status = 'refreshing';
         return this.refreshData(cb);
      }

      return cb(null, this.cache);
   }

   refresh(cb) {
      this.cache.status = 'stale';
      cb();
   }
}

module.exports = GitHub;
