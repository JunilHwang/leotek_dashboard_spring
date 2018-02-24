package Test.Service;

import org.apache.ibatis.session.SqlSession;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.List;

@Service("dashboard")
public class DashboardServiceImpl implements DashboardService {

    @Resource
    private SqlSession sqlSession;

    public void setSqlSession(SqlSession sqlSession) {
        this.sqlSession = sqlSession;
    }

    @Override
    public HashMap MemberGet(HashMap params) {
        return sqlSession.selectOne("Dashboard.MemberGet", params);
    }

    @Override
    public List GraphDataGet(HashMap params) {
        System.out.println("params : " + params);
        return sqlSession.selectList("Dashboard.GraphDataGet", params);
    }

    @Override
    public HashMap GraphPointGet(HashMap params) {
        return sqlSession.selectOne("Dashboard.GraphPointGet", params);
    }
}
