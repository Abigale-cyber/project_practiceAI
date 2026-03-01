# 将 Supabase 替换为本地 PostgreSQL 的步骤指南

本项目当前设计完全兼容本地部署的 PostgreSQL。要将云端的 Supabase 换成本地部署的 PostgreSQL，只需完成以下两步：准备本地数据库环境、修改环境变量并初始化表。

<div style="background-color: #f0f4ff; padding: 20px; border-radius: 8px; margin-top: 20px;">
<table style="width: 100%; border-collapse: collapse; font-family: sans-serif; background-color: #ffffff; color: #1e293b; border: 1px solid #c7d2fe;">
  <thead style="background-color: #4f46e5; color: #ffffff;">
    <tr>
      <th style="padding: 12px; border: 1px solid #818cf8; text-align: left; width: 60px;">步骤</th>
      <th style="padding: 12px; border: 1px solid #818cf8; text-align: left; width: 30%;">操作目标</th>
      <th style="padding: 12px; border: 1px solid #818cf8; text-align: left;">详细说明与指令</th>
    </tr>
  </thead>
  <tbody>
    <tr style="background-color: #e0e7ff;">
      <td style="padding: 12px; border: 1px solid #a5b4fc; text-align: center; font-weight: bold;">1</td>
      <td style="padding: 12px; border: 1px solid #a5b4fc; font-weight: bold; color: #3730a3;">搭建本地 PostgreSQL 数据库</td>
      <td style="padding: 12px; border: 1px solid #a5b4fc;">
        通过 Docker 或者本地系统安装一个 Postgres(推荐使用带有 <code>pgcrypto</code> 支持的普通版本)。<br/><br/>
        <strong>通过 Docker 快速启动指令：</strong><br/>
        <code style="background: #1e1e1e; color: #d4d4d4; padding: 4px 8px; border-radius: 4px; display: block; margin-top: 5px;">docker run --name practice_pg -e POSTGRES_PASSWORD=your_password -e POSTGRES_DB=practice_ai -p 5432:5432 -d postgres:15</code>
      </td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #a5b4fc; text-align: center; font-weight: bold;">2</td>
      <td style="padding: 12px; border: 1px solid #a5b4fc; font-weight: bold; color: #3730a3;">修改项目环境变量连接串</td>
      <td style="padding: 12px; border: 1px solid #a5b4fc;">
        打开项目 <code>backend/app/.env</code> 文件，将 <code>DATABASE_URL</code> 替换为你本地数据库的连接。<br/><br/>
        <strong>修改前：</strong><br/>
        <code style="background: #ffebee; color: #b71c1c; padding: 2px 4px; border-radius: 4px;">DATABASE_URL=postgresql://postgres.xxx:xxx@aws-1...:6543/postgres</code><br/>
        <strong>修改后 (匹配上一步的密码和库名)：</strong><br/>
        <code style="background: #e8f5e9; color: #1b5e20; padding: 2px 4px; border-radius: 4px;">DATABASE_URL=postgresql://postgres:your_password@localhost:5432/practice_ai</code>
      </td>
    </tr>
    <tr style="background-color: #e0e7ff;">
      <td style="padding: 12px; border: 1px solid #a5b4fc; text-align: center; font-weight: bold;">3</td>
      <td style="padding: 12px; border: 1px solid #a5b4fc; font-weight: bold; color: #3730a3;">执行初始化表结构</td>
      <td style="padding: 12px; border: 1px solid #a5b4fc;">
        项目启动或首次运行时会自动依靠 <code>SQLAlchemy</code> 的 <code>Base.metadata.create_all()</code> 创建基础表结构。<br/>
        由于项目中可能涉及一些外键关联和插件（如 <code>pgcrypto</code>），建议你在重新连接上本地数据库后，可以手动执行一下后端目录里的初始化 SQL：<br/><br/>
        <code style="background: #1e1e1e; color: #d4d4d4; padding: 4px 8px; border-radius: 4px; display: block;">psql -h localhost -U postgres -d practice_ai -f backend/init.sql</code>
      </td>
    </tr>
    <tr>
      <td style="padding: 12px; border: 1px solid #a5b4fc; text-align: center; font-weight: bold;">4</td>
      <td style="padding: 12px; border: 1px solid #a5b4fc; font-weight: bold; color: #3730a3;">重启项目</h2></td>
      <td style="padding: 12px; border: 1px solid #a5b4fc;">
        重新运行你的前后端启动命令或者 <code>docker-compose up -d</code>。<br/>
        此时 <code>backend/app/utils/database.py</code> 中判断非 6543 端口分支的逻辑将自动生效，以普通连接池模式匹配你的本地开发环境。
      </td>
    </tr>
  </tbody>
</table>
</div>
