# Pack.it automatic deploy marker

This file exists to trigger and document the automatic company-main preview deployment workflow.

Workflow:

```text
.github/workflows/deploy-company-main-preview.yml
```

Target:

```text
/opt/packit/apps/company-main/current
packit-company-main-preview.service
http://45.148.118.121:8088/#app
```

Latest trigger purpose:

```text
verify GitHub Actions -> SSH -> release -> current symlink -> service restart -> HTTP health check
```
