update job set type = job_type.name
from job_type
where job.type_id = job_type.id;
