# Edit path before adding to Windows Task Scheduler.
$project = 'C:\job_application_agent'
Set-Location $project
& npm run run *>> (Join-Path $project 'daily.log')
